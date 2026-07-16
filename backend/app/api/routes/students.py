"""Student account management (admin side).

Super admin creates student logins directly: full name, real email, a username,
a password, an internship domain, and an optional account-expiry date. Students
log in with EITHER their email or username (resolved to email by auth_public).
Branch admins may read students in their own branch.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.pagination import ilike_or, paginate
from app.core.scoping import log_audit
from app.core.supabase_client import get_scoped_client, get_service_client
from app.models.pagination import Page
from app.models.student import (
    ResetPasswordRequest,
    StudentCreate,
    StudentOut,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["students"])


def _with_domain_label(client, rows: list[dict]) -> list[dict]:
    domain_ids = {r["domain_id"] for r in rows if r.get("domain_id")}
    labels: dict[str, str] = {}
    if domain_ids:
        domains = (
            client.table("domains").select("id,label").in_("id", list(domain_ids)).execute().data
        )
        labels = {d["id"]: d["label"] for d in domains}
    for r in rows:
        r["domain_label"] = labels.get(r.get("domain_id"))
    return rows


@router.get("", response_model=None)
def list_students(
    branch_id: str | None = None,
    domain_id: str | None = None,
    search: str | None = None,
    page: int | None = None,
    page_size: int = 25,
    user: CurrentUser = Depends(get_current_user),
) -> list[dict] | Page:
    if user.is_super_admin:
        client = get_service_client()
        query = client.table("students").select("*", count="exact").order("created_at", desc=True)
        if branch_id:
            query = query.eq("branch_id", branch_id)
    elif user.role == "branch_admin":
        client = get_service_client()
        query = (
            client.table("students")
            .select("*", count="exact")
            .eq("branch_id", user.branch_id)
            .order("created_at", desc=True)
        )
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to list students")

    if domain_id:
        query = query.eq("domain_id", domain_id)
    if search and search.strip():
        query = query.or_(ilike_or(search, ["full_name", "email", "username", "mobile"]))

    if page is None:
        return _with_domain_label(client, query.execute().data)
    result = paginate(query, page, page_size)
    result["items"] = _with_domain_label(client, result["items"])
    return result


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()

    # Validate the domain belongs to the target branch (prevents cross-branch mixups).
    domain = (
        client.table("domains")
        .select("id,branch_id")
        .eq("id", payload.domain_id)
        .execute()
        .data
    )
    if not domain or domain[0]["branch_id"] != payload.branch_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Domain does not belong to the selected branch"
        )

    # Reject duplicate username early with a clear message (DB also enforces it).
    existing = (
        client.table("students").select("id").eq("username", payload.username).execute().data
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Username '{payload.username}' is taken")

    try:
        created = client.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,  # admin-provisioned; no confirmation email
            }
        )
    except Exception as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Could not create auth user (email may be in use): {exc}"
        ) from exc

    new_id = created.user.id
    try:
        row = (
            client.table("students")
            .insert(
                {
                    "id": new_id,
                    "branch_id": payload.branch_id,
                    "domain_id": payload.domain_id,
                    "full_name": payload.full_name,
                    "email": payload.email,
                    "username": payload.username,
                    "mobile": payload.mobile,
                    "account_expiry": payload.account_expiry.isoformat()
                    if payload.account_expiry
                    else None,
                    "is_active": True,
                }
            )
            .execute()
            .data[0]
        )
    except Exception as exc:
        client.auth.admin.delete_user(new_id)  # no orphaned auth user
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create student: {exc}") from exc

    log_audit(client, user, "create", "student", new_id, {"username": payload.username})
    return _with_domain_label(client, [row])[0]


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str, payload: StudentUpdate, user: CurrentUser = Depends(require_super_admin)
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    if "account_expiry" in updates and updates["account_expiry"] is not None:
        updates["account_expiry"] = updates["account_expiry"].isoformat()

    client = get_service_client()
    res = client.table("students").update(updates).eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    log_audit(client, user, "update", "student", student_id, updates)
    return _with_domain_label(client, [res.data[0]])[0]


@router.post("/{student_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_student_password(
    student_id: str, payload: ResetPasswordRequest, user: CurrentUser = Depends(require_super_admin)
):
    """Admin-driven password reset — the counterpart to the student's own
    self-service email reset. Used when a student is locked out."""
    client = get_service_client()
    student = client.table("students").select("id").eq("id", student_id).execute().data
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    client.auth.admin.update_user_by_id(student_id, {"password": payload.password})
    log_audit(client, user, "reset_password", "student", student_id)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_student(
    student_id: str,
    hard: bool = False,
    user: CurrentUser = Depends(require_super_admin),
):
    """Soft-deactivate by default: is_active=false blocks the student on their
    next request (enforced by require_student), even with a still-valid token.
    ``hard=true`` permanently removes the student and their login instead.
    """
    client = get_service_client()

    if hard:
        # Check up front — after the delete below the row is legitimately gone,
        # so a missing row at that point must not be reported as "not found".
        existing = client.table("students").select("id").eq("id", student_id).execute().data
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")

        # students.id references auth.users(id) ON DELETE CASCADE, so removing
        # the login also removes the student row and their progress/attempts.
        try:
            client.auth.admin.delete_user(student_id)
        except Exception:
            pass  # login already gone — fall through and purge the row directly

        # Safety net for the case where no cascade fired (auth user missing).
        client.table("students").delete().eq("id", student_id).execute()
        log_audit(client, user, "delete", "student", student_id)
        return

    res = client.table("students").update({"is_active": False}).eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    log_audit(client, user, "deactivate", "student", student_id)

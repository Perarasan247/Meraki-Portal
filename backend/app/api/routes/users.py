from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.scoping import log_audit
from app.core.supabase_client import get_scoped_client, get_service_client
from app.models.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

_ALL_MODULES = [
    "dashboard", "enquiry", "enrollment", "batch_management", "batch_execution",
    "curriculum", "expense", "marketing", "reports", "student_management",
    "user_management", "my_account",
]


def _last_login_map() -> dict[str, str]:
    """Real last-sign-in times tracked by Supabase Auth, keyed by user id.

    ``profiles.last_login`` is never written on login (auth happens in Supabase),
    so we read the authoritative ``auth.users.last_sign_in_at`` instead.
    """
    client = get_service_client()
    logins: dict[str, str] = {}
    try:
        page = 1
        while True:
            batch = client.auth.admin.list_users(page=page, per_page=1000)
            users = batch if isinstance(batch, list) else getattr(batch, "users", []) or []
            if not users:
                break
            for u in users:
                ts = getattr(u, "last_sign_in_at", None)
                if ts:
                    logins[u.id] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            if len(users) < 1000:
                break
            page += 1
    except Exception:
        pass  # fall back to whatever profiles.last_login holds
    return logins


def _with_last_login(rows: list[dict]) -> list[dict]:
    logins = _last_login_map()
    for r in rows:
        if logins.get(r["id"]):
            r["last_login"] = logins[r["id"]]
    return rows


@router.get("", response_model=list[UserOut])
def list_users(branch_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if user.is_super_admin:
        client = get_service_client()
        query = client.table("profiles").select("*")
        if branch_id:
            query = query.eq("branch_id", branch_id)
        return _with_last_login(query.execute().data)

    if user.role == "branch_admin":
        client = get_scoped_client(user.access_token)
        rows = client.table("profiles").select("*").eq("branch_id", user.branch_id).execute().data
        return _with_last_login(rows)

    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to list users")


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, user: CurrentUser = Depends(require_super_admin)):
    # Only Admin (branch_admin) and Trainer accounts are creatable here; the
    # schema already rejects other roles. Both are always scoped to a branch.
    if payload.role not in ("branch_admin", "trainer"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only Admin or Trainer accounts can be created here; use the Students module for student logins",
        )
    if not payload.branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    client = get_service_client()
    created = client.auth.admin.create_user(
        {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
        }
    )
    new_user_id = created.user.id

    try:
        row = (
            client.table("profiles")
            .insert(
                {
                    "id": new_user_id,
                    "branch_id": payload.branch_id,
                    "full_name": payload.full_name,
                    "email": payload.email,
                    "mobile": payload.mobile,
                    "role": payload.role,
                    "modules": payload.modules,
                    "permission_level": payload.permission_level,
                }
            )
            .execute()
            .data[0]
        )
    except Exception:
        # Avoid leaving an orphaned auth user if the profile insert fails.
        client.auth.admin.delete_user(new_user_id)
        raise

    log_audit(client, user, "create", "user", new_user_id, {"email": payload.email})
    return row


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, user: CurrentUser = Depends(get_current_user)):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    if user.is_super_admin:
        client = get_service_client()
    elif user.role == "branch_admin":
        client = get_scoped_client(user.access_token)
        target = client.table("profiles").select("branch_id").eq("id", user_id).execute().data
        if not target or target[0]["branch_id"] != user.branch_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot modify users outside your branch")
        # Role, branch and login email are super-admin territory.
        for field in ("role", "branch_id", "email"):
            if field in updates:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN, f"Only a super admin can change a user's {field}"
                )
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to update users")

    service = get_service_client()
    existing = service.table("profiles").select("role").eq("id", user_id).single().execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # The super admin's role/branch may only change through the transfer flow,
    # which keeps exactly one super admin at all times.
    if existing["role"] == "super_admin" and ("role" in updates or "branch_id" in updates):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot change the super admin's role or branch — use Transfer Super Admin.",
        )

    # Email is the login credential and lives in Supabase Auth; the profiles row
    # only mirrors it. Update auth first so we never show an email they can't
    # actually sign in with.
    if "email" in updates and updates["email"]:
        try:
            service.auth.admin.update_user_by_id(
                user_id, {"email": updates["email"], "email_confirm": True}
            )
        except Exception as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Could not update the login email — it may already be in use by another account.",
            ) from exc

    result = client.table("profiles").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    log_audit(client, user, "update", "user", user_id, updates)
    return result.data[0]


@router.post("/{user_id}/transfer-super-admin")
def transfer_super_admin(user_id: str, user: CurrentUser = Depends(require_super_admin)):
    """Hand over super admin to another user. The current super admin is
    demoted to a branch admin of the promoted user's branch. There is always
    exactly one super admin afterwards."""
    if user_id == user.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot transfer super admin to yourself")

    client = get_service_client()
    target = client.table("profiles").select("*").eq("id", user_id).single().execute().data
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Target user not found")
    if target["role"] == "super_admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That user is already a super admin")
    if not target.get("is_active", True):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot transfer to a deactivated user")
    target_branch = target.get("branch_id")
    if not target_branch:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Target user has no branch assigned")

    # Promote the target to super admin (branch-wide).
    client.table("profiles").update(
        {"role": "super_admin", "branch_id": None, "modules": _ALL_MODULES, "permission_level": "Full Access"}
    ).eq("id", user_id).execute()

    # Demote the current super admin to a branch admin of the promoted user's branch.
    client.table("profiles").update(
        {"role": "branch_admin", "branch_id": target_branch, "modules": _ALL_MODULES, "permission_level": "Full Access"}
    ).eq("id", user.user_id).execute()

    log_audit(client, user, "transfer_super_admin", "user", user_id, {"to": target.get("email")})
    return {"ok": True, "new_super_admin_id": user_id}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: str,
    hard: bool = False,
    user: CurrentUser = Depends(require_super_admin),
):
    """Soft-deactivate a user (default) or permanently delete when ``hard=true``."""
    client = get_service_client()
    target = client.table("profiles").select("role").eq("id", user_id).single().execute().data
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target["role"] == "super_admin":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot deactivate or delete a super admin. Transfer super admin to someone else first.",
        )

    if hard:
        # Permanent delete: remove the auth login (cascades to the profile when
        # the FK cascades) and the profile row explicitly as a safety net.
        try:
            client.auth.admin.delete_user(user_id)
        except Exception:
            pass  # auth user may already be gone; still purge the profile
        client.table("profiles").delete().eq("id", user_id).execute()
        log_audit(client, user, "delete", "user", user_id)
        return

    result = client.table("profiles").update({"is_active": False}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    log_audit(client, user, "deactivate", "user", user_id)


@router.get("/module-access-coverage")
def module_access_coverage(user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()
    profiles = client.table("profiles").select("modules").execute().data
    tally: Counter = Counter()
    for profile in profiles:
        for module in profile.get("modules") or []:
            tally[module] += 1
    return dict(tally)

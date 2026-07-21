from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.supabase_client import get_scoped_client, get_service_client

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("")
def list_branches(user: CurrentUser = Depends(get_current_user)):
    if user.is_super_admin:
        client = get_service_client()
        return client.table("branches").select("*").order("name").execute().data
    client = get_scoped_client(user.access_token)
    return client.table("branches").select("*").eq("id", user.branch_id).execute().data


@router.post("", status_code=status.HTTP_201_CREATED)
def create_branch(payload: dict, user: CurrentUser = Depends(require_super_admin)):
    name = payload.get("name")
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name is required")
    client = get_service_client()
    row = (
        client.table("branches")
        .insert({"name": name, "address": payload.get("address"), "created_by": user.user_id})
        .execute()
        .data[0]
    )
    return row


# Business records that block a branch delete, in the order they're reported —
# (table, singular, plural). `domains` and `students` cascade in the DB, but
# students are real accounts, so they're checked here too — a branch delete must
# never silently wipe them. (`domains` are just config labels, left to cascade.)
_BRANCH_DEPENDENTS: list[tuple[str, str, str]] = [
    ("profiles", "user", "users"),
    ("enquiries", "enquiry", "enquiries"),
    ("enrollments", "enrollment", "enrollments"),
    ("batches", "batch", "batches"),
    ("curricula", "curriculum", "curricula"),
    ("expenses", "expense", "expenses"),
    ("students", "student", "students"),
    ("campaigns", "campaign", "campaigns"),
]


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(branch_id: str, user: CurrentUser = Depends(require_super_admin)):
    """Delete a branch — only when it holds no records.

    A branch is referenced by users, enquiries, enrollments, fee records,
    students and more, almost all without a DB cascade. Rather than destroy that
    data, we refuse the delete and report what's still in the branch so the admin
    can move or remove it first. Only an empty branch can be removed.
    """
    client = get_service_client()

    existing = client.table("branches").select("id").eq("id", branch_id).execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Branch not found")

    blocking: list[str] = []
    for table, singular, plural in _BRANCH_DEPENDENTS:
        n = (
            client.table(table)
            .select("id", count="exact")
            .eq("branch_id", branch_id)
            .limit(1)
            .execute()
            .count
            or 0
        )
        if n:
            blocking.append(f"{n} {singular if n == 1 else plural}")

    if blocking:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This branch still has " + ", ".join(blocking) + ". "
            "Move or remove them first, then delete the branch.",
        )

    # Empty of business data — its domain labels cascade away on delete.
    client.table("branches").delete().eq("id", branch_id).execute()

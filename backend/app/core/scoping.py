"""
Shared helpers so every module route applies the same branch-scoping and
audit-log pattern instead of reimplementing it per module.
"""

from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.core.auth import CurrentUser


def resolve_branch_id(user: CurrentUser, requested_branch_id: str | None) -> str | None:
    """
    Super admin may pass ?branch_id=... to scope to one branch, or omit it for
    an all-branches view (None). Non-admins are always pinned to their own
    branch_id regardless of what they pass.
    """
    if user.is_super_admin:
        return requested_branch_id
    if not user.branch_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User has no branch assigned")
    return user.branch_id


def apply_branch_filter(query, branch_id: str | None):
    if branch_id is not None:
        query = query.eq("branch_id", branch_id)
    return query


def log_audit(
    client: Client,
    user: CurrentUser,
    action: str,
    entity: str,
    entity_id: str | None,
    details: dict[str, Any] | None = None,
) -> None:
    client.table("audit_log").insert(
        {
            "user_id": user.user_id,
            "branch_id": user.branch_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "details": details or {},
        }
    ).execute()

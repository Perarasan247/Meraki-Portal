from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.account import BackupCounts, RestoreRequest

router = APIRouter(prefix="/account", tags=["account"])

BACKUP_TABLES = ["enquiries", "enrollments", "batches", "expenses", "curricula"]


@router.get("/profile")
def get_profile(user: CurrentUser = Depends(get_current_user)):
    client = get_scoped_client(user.access_token)
    profile = client.table("profiles").select("*").eq("id", user.user_id).single().execute().data
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


@router.get("/backup/counts", response_model=BackupCounts)
def backup_counts(branch_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)

    def count(table: str) -> int:
        return len(apply_branch_filter(client.table(table).select("id"), scope).execute().data)

    return {
        "branch_id": scope,
        "enquiries": count("enquiries"),
        "enrollments": count("enrollments"),
        "batches": count("batches"),
        "expenses": count("expenses"),
        "curricula": count("curricula"),
    }


@router.get("/backup/export")
def backup_export(branch_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)

    def rows(table: str):
        return apply_branch_filter(client.table(table).select("*"), scope).execute().data

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "branch_id": scope,
        "enquiries": rows("enquiries"),
        "enrollments": rows("enrollments"),
        "batches": rows("batches"),
        "expenses": rows("expenses"),
        "curricula": rows("curricula"),
    }


@router.post("/backup/restore")
def backup_restore(
    payload: RestoreRequest,
    branch_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    client = get_scoped_client(user.access_token)
    target_branch_id = resolve_branch_id(user, branch_id or payload.branch_id)
    if not target_branch_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "A resolvable branch_id is required to restore"
        )

    restored: dict[str, int] = {}
    errors: list[str] = []

    for table in BACKUP_TABLES:
        rows = getattr(payload, table)
        if not rows:
            restored[table] = 0
            continue
        try:
            # Never trust the uploaded branch_id — always re-stamp to the
            # resolved target scope before writing, regardless of what the
            # file claims.
            mismatched = sum(
                1 for row in rows if row.get("branch_id") and row["branch_id"] != target_branch_id
            )
            if mismatched:
                errors.append(f"{table}: {mismatched} row(s) had an out-of-scope branch_id, restamped")
            count = 0
            for row in rows:
                clean_row = dict(row)
                clean_row["branch_id"] = target_branch_id
                client.table(table).upsert(clean_row).execute()
                count += 1
            restored[table] = count
        except Exception as exc:
            errors.append(f"{table}: {exc}")

    log_audit(client, user, "restore", "account_backup", None, {"restored": restored})
    return {"restored": restored, "errors": errors}

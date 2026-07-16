from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.batch_execution import (
    BatchExecutionCreate,
    BatchExecutionOut,
    BatchExecutionUpdate,
)

router = APIRouter(prefix="/batch-execution", tags=["batch_execution"])

MODULE = "batch_execution"


@router.get("", response_model=list[BatchExecutionOut])
def list_batch_execution(
    branch_id: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = apply_branch_filter(client.table("batch_execution").select("*"), scope)
    return query.execute().data


@router.get("/by-batch/{batch_id}", response_model=BatchExecutionOut)
def get_by_batch(batch_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("batch_execution").select("*").eq("batch_id", batch_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No execution record for this batch")
    return result.data[0]


@router.post("", response_model=BatchExecutionOut, status_code=status.HTTP_201_CREATED)
def create_batch_execution(
    payload: BatchExecutionCreate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        # A super admin has no branch of their own — inherit it from the batch
        # this execution tracks, so no branch needs to be passed in.
        batch = (
            client.table("batches").select("branch_id").eq("id", payload.batch_id).single().execute().data
        )
        branch_id = batch.get("branch_id") if batch else None
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = {
        "branch_id": branch_id,
        "batch_id": payload.batch_id,
        "curriculum_id": payload.curriculum_id,
        "phase_progress": [],
        "progress_pct": 0,
    }
    row = client.table("batch_execution").insert(data).execute().data[0]
    log_audit(client, user, "create", "batch_execution", row["id"], {"batch_id": payload.batch_id})
    return row


@router.patch("/{execution_id}", response_model=BatchExecutionOut)
def update_batch_execution(
    execution_id: str, payload: BatchExecutionUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    existing = (
        client.table("batch_execution").select("*").eq("id", execution_id).execute().data
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch execution record not found")
    execution = existing[0]

    curriculum = (
        client.table("curricula")
        .select("phases")
        .eq("id", execution["curriculum_id"])
        .single()
        .execute()
        .data
    )
    total_phases = len((curriculum or {}).get("phases") or [])
    phase_progress = [p.model_dump(mode="json") for p in payload.phase_progress]
    completed_phases = sum(1 for p in phase_progress if p.get("status") == "Completed")
    progress_pct = round((completed_phases / total_phases) * 100, 2) if total_phases else 0

    result = (
        client.table("batch_execution")
        .update({"phase_progress": phase_progress, "progress_pct": progress_pct})
        .eq("id", execution_id)
        .execute()
    )
    log_audit(client, user, "update", "batch_execution", execution_id, {"progress_pct": progress_pct})
    return result.data[0]

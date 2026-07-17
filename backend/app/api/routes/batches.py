from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.pagination import ilike_or, paginate
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.batch import BatchCreate, BatchOut, BatchUpdate
from app.models.pagination import Page
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/batches", tags=["batches"])

MODULE = "batch_management"

# Columns the list view may sort by. Whitelisted so a bad/injected value can't
# reach the database — anything else falls back to created_at.
_SORTABLE = {
    "batch_name",
    "program",
    "scope",
    "trainer",
    "start_date",
    "seats_filled",
    "status",
    "created_at",
}


@router.get("", response_model=None)
def list_batches(
    branch_id: str | None = None,
    program: str | None = None,
    mode: str | None = None,
    scope_filter: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int | None = None,
    page_size: int = 25,
    user: CurrentUser = Depends(require_module(MODULE)),
) -> list[dict] | Page:
    """Returns a plain array when no ``page`` is given, or a paginated ``Page``
    envelope when ``page`` is provided.

    The array form is load-bearing: the batch dropdowns on Enrollment and Batch
    Execution read this endpoint and need every batch, not a page of them.
    """
    client = get_scoped_client(user.access_token)
    branch_scope = resolve_branch_id(user, branch_id)
    order_col = sort_by if sort_by in _SORTABLE else "created_at"
    query = (
        client.table("batches")
        .select("*", count="exact")
        .order(order_col, desc=(sort_dir != "asc"))
    )
    query = apply_branch_filter(query, branch_scope)
    if program:
        query = query.eq("program", program)
    if mode:
        query = query.eq("mode", mode)
    if scope_filter:
        query = query.eq("scope", scope_filter)
    if status_filter:
        query = query.eq("status", status_filter)
    if search and search.strip():
        query = query.or_(ilike_or(search, ["batch_name", "program", "trainer", "venue"]))
    if page is None:
        return query.execute().data
    return paginate(query, page, page_size)


@router.get("/export")
def export_batches(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("batches").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Batches", "batches.xlsx")


@router.post("", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    row = client.table("batches").insert(data).execute().data[0]
    log_audit(client, user, "create", "batch", row["id"], {"batch_name": row["batch_name"]})
    return row


@router.patch("/{batch_id}", response_model=BatchOut)
def update_batch(
    batch_id: str,
    payload: BatchUpdate,
    force: bool = False,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    """Update a batch.

    Moving it to another branch is special: a batch and its enrolled students
    each carry their own ``branch_id``, so moving the batch alone would strand
    the students in the old branch — visible to that branch's admin, but sitting
    in a batch they can no longer see. So the move drags the enrolled students
    and the progress tracking along with it, and we answer 409 first so the
    caller can confirm.
    """
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    # `branch_id` is only a move if it was sent AND actually differs.
    new_branch = updates.pop("branch_id", None)
    existing = client.table("batches").select("branch_id").eq("id", batch_id).single().execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")
    moving = bool(new_branch) and new_branch != existing["branch_id"]

    if moving:
        if not user.is_super_admin:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Only a super admin can move a batch to another branch"
            )
        enrolled = client.table("enrollments").select("id").eq("batch_id", batch_id).execute().data
        tracked = client.table("batch_execution").select("id").eq("batch_id", batch_id).execute().data
        if (enrolled or tracked) and not force:
            parts = []
            if enrolled:
                n = len(enrolled)
                parts.append(f"{n} enrolled student{'s' if n > 1 else ''} will move to the new branch")
            if tracked:
                parts.append(
                    "its Batch Execution progress moves too, but the curriculum it tracks belongs to "
                    "the old branch and may need re-selecting"
                )
            raise HTTPException(
                status.HTTP_409_CONFLICT, "This batch is in use: " + "; ".join(parts) + "."
            )
        updates["branch_id"] = new_branch

    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    result = client.table("batches").update(updates).eq("id", batch_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    if moving:
        # Keep the dependents' branch in step with the batch they belong to.
        client.table("enrollments").update({"branch_id": new_branch}).eq("batch_id", batch_id).execute()
        client.table("batch_execution").update({"branch_id": new_branch}).eq("batch_id", batch_id).execute()

    log_audit(client, user, "update", "batch", batch_id, updates)
    return result.data[0]


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: str,
    force: bool = False,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    """Delete a batch.

    Nothing cascades to a batch, so anything pointing at it must be dealt with
    first. We answer 409 so the caller can confirm, then on ``force=true``:
      * enrolled students are UNASSIGNED (batch_id -> null). Their enrollment and
        fee records are never deleted — that's real money data.
      * its Batch Execution progress tracking is removed.
    """
    client = get_scoped_client(user.access_token)

    enrolled = client.table("enrollments").select("id").eq("batch_id", batch_id).execute().data
    tracked = client.table("batch_execution").select("id").eq("batch_id", batch_id).execute().data

    if (enrolled or tracked) and not force:
        parts = []
        if enrolled:
            n = len(enrolled)
            parts.append(
                f"{n} enrolled student{'s' if n > 1 else ''} will be unassigned from it "
                f"(their enrollment and fee records are kept)"
            )
        if tracked:
            parts.append("its progress tracking in Batch Execution will be removed")
        raise HTTPException(status.HTTP_409_CONFLICT, "This batch is in use: " + "; ".join(parts) + ".")

    if enrolled:
        client.table("enrollments").update({"batch_id": None}).eq("batch_id", batch_id).execute()
    if tracked:
        client.table("batch_execution").delete().eq("batch_id", batch_id).execute()

    result = client.table("batches").delete().eq("id", batch_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")
    log_audit(client, user, "delete", "batch", batch_id, {"unassigned": len(enrolled)})

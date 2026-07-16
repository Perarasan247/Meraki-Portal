from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.curriculum import CurriculumCreate, CurriculumOut, CurriculumUpdate
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/curricula", tags=["curricula"])

MODULE = "curriculum"


@router.get("", response_model=list[CurriculumOut])
def list_curricula(
    branch_id: str | None = None,
    program: str | None = None,
    status_filter: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = client.table("curricula").select("*").order("created_at", desc=True)
    query = apply_branch_filter(query, scope)
    if program:
        query = query.eq("program", program)
    if status_filter:
        query = query.eq("status", status_filter)
    return query.execute().data


@router.get("/export")
def export_curricula(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("curricula").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Curricula", "curricula.xlsx")


@router.post("", response_model=CurriculumOut, status_code=status.HTTP_201_CREATED)
def create_curriculum(payload: CurriculumCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    row = client.table("curricula").insert(data).execute().data[0]
    log_audit(client, user, "create", "curriculum", row["id"], {"title": row["title"]})
    return row


@router.patch("/{curriculum_id}", response_model=CurriculumOut)
def update_curriculum(
    curriculum_id: str, payload: CurriculumUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("curricula").update(updates).eq("id", curriculum_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curriculum not found")
    log_audit(client, user, "update", "curriculum", curriculum_id, updates)
    return result.data[0]


@router.delete("/{curriculum_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curriculum(
    curriculum_id: str,
    force: bool = False,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    """Deletes the internship and (via ON DELETE CASCADE) its sections, lessons,
    content blocks and quizzes.

    batch_execution.curriculum_id has no cascade and holds real batch progress,
    so if any batch tracks this internship we answer 409 and let the caller
    confirm. Re-sending with ``force=true`` drops that tracking first.
    """
    client = get_scoped_client(user.access_token)

    linked = (
        client.table("batch_execution").select("id").eq("curriculum_id", curriculum_id).execute().data
    )
    if linked and not force:
        n = len(linked)
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This internship is tracked by {n} batch{'es' if n > 1 else ''} in Batch Execution. "
            f"Deleting it will also remove that batch progress tracking.",
        )
    if linked:
        client.table("batch_execution").delete().eq("curriculum_id", curriculum_id).execute()

    result = client.table("curricula").delete().eq("id", curriculum_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curriculum not found")
    log_audit(client, user, "delete", "curriculum", curriculum_id, {"forced": bool(linked)})


@router.patch("/{curriculum_id}/publish", response_model=CurriculumOut)
def publish_curriculum(curriculum_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = (
        client.table("curricula").update({"status": "Published"}).eq("id", curriculum_id).execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curriculum not found")
    log_audit(client, user, "publish", "curriculum", curriculum_id)
    return result.data[0]


@router.patch("/{curriculum_id}/unpublish", response_model=CurriculumOut)
def unpublish_curriculum(curriculum_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("curricula").update({"status": "Draft"}).eq("id", curriculum_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curriculum not found")
    log_audit(client, user, "unpublish", "curriculum", curriculum_id)
    return result.data[0]

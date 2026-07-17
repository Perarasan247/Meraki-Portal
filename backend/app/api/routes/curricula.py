from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.pagination import ilike_or, paginate
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.curriculum import CurriculumCreate, CurriculumOut, CurriculumUpdate
from app.models.pagination import Page
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/curricula", tags=["curricula"])

MODULE = "curriculum"

# Columns the list view may sort by. Whitelisted so a bad/injected value can't
# reach the database — anything else falls back to created_at.
_SORTABLE = {"title", "program", "scope", "status", "created_at"}


@router.get("", response_model=None)
def list_curricula(
    branch_id: str | None = None,
    program: str | None = None,
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

    The array form is load-bearing: Batch Execution and the curriculum builder
    read this endpoint and need every curriculum, not a page of them.
    """
    client = get_scoped_client(user.access_token)
    branch_scope = resolve_branch_id(user, branch_id)
    order_col = sort_by if sort_by in _SORTABLE else "created_at"
    query = (
        client.table("curricula")
        .select("*", count="exact")
        .order(order_col, desc=(sort_dir != "asc"))
    )
    query = apply_branch_filter(query, branch_scope)
    if program:
        query = query.eq("program", program)
    if scope_filter:
        query = query.eq("scope", scope_filter)
    if status_filter:
        query = query.eq("status", status_filter)
    if search and search.strip():
        query = query.or_(ilike_or(search, ["title", "program"]))
    if page is None:
        return query.execute().data
    return paginate(query, page, page_size)


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

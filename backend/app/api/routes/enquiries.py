from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.pagination import ilike_or, paginate
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.enquiry import (
    ConvertToEnrollmentRequest,
    EnquiryCreate,
    EnquiryOut,
    EnquiryUpdate,
)
from app.models.pagination import Page
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

MODULE = "enquiry"

# Only the columns the list view needs (avoids over-fetching wide rows).
_LIST_COLS = (
    "id,branch_id,student_name,email,mobile,college,enquiry_type,program,year_of_study,"
    "reference_source,campaign_id,status,notes,created_at,converted_enrollment_id"
)


# Columns the list view may sort by. Whitelisted so a bad/injected value can't
# reach the database — anything else falls back to created_at.
_SORTABLE = {"student_name", "mobile", "program", "year_of_study", "status", "created_at"}


@router.get("", response_model=None)
def list_enquiries(
    branch_id: str | None = None,
    status_filter: str | None = None,
    program: str | None = None,
    year_of_study: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int | None = None,
    page_size: int = 25,
    user: CurrentUser = Depends(require_module(MODULE)),
) -> list[dict] | Page:
    """Returns a plain array when no ``page`` is given (aggregate/board views),
    or a paginated ``Page`` envelope when ``page`` is provided (list tables).

    Sorting is applied in the database so it orders the whole result set, not
    just the rows on the current page.
    """
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    order_col = sort_by if sort_by in _SORTABLE else "created_at"
    query = (
        client.table("enquiries")
        .select(_LIST_COLS, count="exact")
        .order(order_col, desc=(sort_dir != "asc"))
    )
    query = apply_branch_filter(query, scope)
    if status_filter:
        query = query.eq("status", status_filter)
    if program:
        query = query.eq("program", program)
    if year_of_study:
        query = query.eq("year_of_study", year_of_study)
    if search and search.strip():
        query = query.or_(ilike_or(search, ["student_name", "mobile", "program", "email"]))
    if page is None:
        return query.execute().data
    return paginate(query, page, page_size)


@router.get("/export")
def export_enquiries(
    branch_id: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = apply_branch_filter(
        client.table("enquiries").select("*").order("created_at", desc=True), scope
    )
    rows = query.execute().data
    return export_rows_to_xlsx(rows, "Enquiries", "enquiries.xlsx")


@router.post("", response_model=EnquiryOut, status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"})
    data["branch_id"] = branch_id
    result = client.table("enquiries").insert(data).execute()
    row = result.data[0]
    log_audit(client, user, "create", "enquiry", row["id"], {"student_name": row["student_name"]})
    return row


@router.patch("/{enquiry_id}", response_model=EnquiryOut)
def update_enquiry(
    enquiry_id: str, payload: EnquiryUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("enquiries").update(updates).eq("id", enquiry_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    row = result.data[0]
    log_audit(client, user, "update", "enquiry", enquiry_id, updates)
    return row


@router.delete("/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enquiry(enquiry_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("enquiries").delete().eq("id", enquiry_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    log_audit(client, user, "delete", "enquiry", enquiry_id)


@router.post("/{enquiry_id}/convert", status_code=status.HTTP_201_CREATED)
def convert_to_enrollment(
    enquiry_id: str,
    payload: ConvertToEnrollmentRequest,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    """Converts an enquiry into a linked enrollment record and marks it Converted."""
    client = get_scoped_client(user.access_token)
    enquiry_res = client.table("enquiries").select("*").eq("id", enquiry_id).single().execute()
    enquiry = enquiry_res.data
    if not enquiry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")

    enrollment = (
        client.table("enrollments")
        .insert(
            {
                "branch_id": enquiry["branch_id"],
                "student_name": enquiry["student_name"],
                "mobile": enquiry["mobile"],
                # Carry the contact details captured on the enquiry.
                "email": enquiry.get("email"),
                "college": enquiry.get("college"),
                "program": enquiry["program"],
                "year_of_study": enquiry["year_of_study"],
                "batch_id": payload.batch_id,
                "total_fee": payload.total_fee,
                "paid_amount": 0,
                "fee_status": "Pending",
                "enquiry_id": enquiry_id,
            }
        )
        .execute()
        .data[0]
    )

    client.table("enquiries").update(
        {"status": "Converted", "converted_enrollment_id": enrollment["id"]}
    ).eq("id", enquiry_id).execute()

    log_audit(client, user, "convert", "enquiry", enquiry_id, {"enrollment_id": enrollment["id"]})
    return enrollment

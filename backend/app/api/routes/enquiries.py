from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.enquiry import (
    ConvertToEnrollmentRequest,
    EnquiryCreate,
    EnquiryOut,
    EnquiryUpdate,
)
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

MODULE = "enquiry"


@router.get("", response_model=list[EnquiryOut])
def list_enquiries(
    branch_id: str | None = None,
    status_filter: str | None = None,
    program: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = client.table("enquiries").select("*").order("created_at", desc=True)
    query = apply_branch_filter(query, scope)
    if status_filter:
        query = query.eq("status", status_filter)
    if program:
        query = query.eq("program", program)
    result = query.execute()
    return result.data


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

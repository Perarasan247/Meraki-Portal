from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.enrollment import (
    EnrollmentCreate,
    EnrollmentOut,
    EnrollmentUpdate,
    PaymentRequest,
)
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/enrollments", tags=["enrollments"])
MODULE = "enrollment"


def _fee_status(total: float, paid: float) -> str:
    if paid <= 0:
        return "Pending"
    if paid >= total:
        return "Paid"
    return "Partial"


@router.get("", response_model=list[EnrollmentOut])
def list_enrollments(
    branch_id: str | None = None,
    fee_status: str | None = None,
    program: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = client.table("enrollments").select("*").order("created_at", desc=True)
    query = apply_branch_filter(query, scope)
    if fee_status:
        query = query.eq("fee_status", fee_status)
    if program:
        query = query.eq("program", program)
    return query.execute().data


@router.get("/export")
def export_enrollments(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("enrollments").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Enrollments", "enrollments.xlsx")


@router.post("", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def create_enrollment(payload: EnrollmentCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"})
    data["branch_id"] = branch_id
    data["fee_status"] = _fee_status(payload.total_fee, payload.paid_amount)
    row = client.table("enrollments").insert(data).execute().data[0]
    log_audit(client, user, "create", "enrollment", row["id"], {"student_name": row["student_name"]})
    return row


@router.patch("/{enrollment_id}", response_model=EnrollmentOut)
def update_enrollment(
    enrollment_id: str, payload: EnrollmentUpdate, user: CurrentUser = Depends(require_module(MODULE))
):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("enrollments").update(updates).eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    log_audit(client, user, "update", "enrollment", enrollment_id, updates)
    return result.data[0]


@router.post("/{enrollment_id}/payment", response_model=EnrollmentOut)
def record_payment(
    enrollment_id: str, payload: PaymentRequest, user: CurrentUser = Depends(require_module(MODULE))
):
    """Adds a payment, recomputing paid_amount and fee_status. Feeds Finance/revenue totals."""
    client = get_scoped_client(user.access_token)
    existing = client.table("enrollments").select("*").eq("id", enrollment_id).single().execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")

    new_paid = float(existing["paid_amount"]) + payload.amount
    new_status = _fee_status(float(existing["total_fee"]), new_paid)

    row = (
        client.table("enrollments")
        .update({"paid_amount": new_paid, "fee_status": new_status})
        .eq("id", enrollment_id)
        .execute()
        .data[0]
    )
    log_audit(client, user, "payment", "enrollment", enrollment_id, {"amount": payload.amount})
    return row


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(enrollment_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("enrollments").delete().eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    log_audit(client, user, "delete", "enrollment", enrollment_id)

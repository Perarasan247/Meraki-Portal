from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.pagination import ilike_or, paginate
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.enrollment import (
    EnrollmentCreate,
    EnrollmentOut,
    EnrollmentUpdate,
    PaymentRequest,
)
from app.models.pagination import Page
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/enrollments", tags=["enrollments"])
MODULE = "enrollment"


def _fee_status(total: float, paid: float) -> str:
    if paid <= 0:
        return "Pending"
    if paid >= total:
        return "Paid"
    return "Partial"


# Columns the list view may sort by. Whitelisted so a bad/injected value can't
# reach the database. `batch_id` is deliberately absent — it's a UUID, and the
# readable batch name is resolved client-side, so ordering by it is meaningless.
_SORTABLE = {"student_name", "program", "pending_amount", "fee_status", "created_at"}


@router.get("", response_model=None)
def list_enrollments(
    branch_id: str | None = None,
    fee_status: str | None = None,
    program: str | None = None,
    year_of_study: str | None = None,
    batch_id: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int | None = None,
    page_size: int = 25,
    user: CurrentUser = Depends(require_module(MODULE)),
) -> list[dict] | Page:
    """Sorting is applied in the database so it orders the whole result set,
    not just the rows on the current page."""
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    order_col = sort_by if sort_by in _SORTABLE else "created_at"
    query = (
        client.table("enrollments")
        .select("*", count="exact")
        .order(order_col, desc=(sort_dir != "asc"))
    )
    query = apply_branch_filter(query, scope)
    if fee_status:
        query = query.eq("fee_status", fee_status)
    if program:
        query = query.eq("program", program)
    if year_of_study:
        query = query.eq("year_of_study", year_of_study)
    if batch_id:
        query = query.eq("batch_id", batch_id)
    if search and search.strip():
        query = query.or_(ilike_or(search, ["student_name", "mobile", "program"]))
    if page is None:
        return query.execute().data
    return paginate(query, page, page_size)


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

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
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
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    # Keep fee_status consistent when the fee figures are edited.
    if "total_fee" in updates or "paid_amount" in updates:
        existing = (
            client.table("enrollments")
            .select("total_fee, paid_amount")
            .eq("id", enrollment_id)
            .single()
            .execute()
            .data
        )
        if existing:
            total = float(updates.get("total_fee", existing["total_fee"]))
            paid = float(updates.get("paid_amount", existing["paid_amount"]))
            updates["fee_status"] = _fee_status(total, paid)

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

    # Nothing cascades to an enrollment, so clear the two references first:
    #  1. The source enquiry (if it was converted) — unlink it and reopen it to
    #     "Interested", so the lead isn't left pointing at a deleted enrollment.
    #  2. Any student record created from it — detach it (student data is kept).
    client.table("enquiries").update(
        {"converted_enrollment_id": None, "status": "Interested"}
    ).eq("converted_enrollment_id", enrollment_id).execute()
    client.table("students").update({"enrollment_id": None}).eq("enrollment_id", enrollment_id).execute()

    result = client.table("enrollments").delete().eq("id", enrollment_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    log_audit(client, user, "delete", "enrollment", enrollment_id)

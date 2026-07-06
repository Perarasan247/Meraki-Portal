from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/expenses", tags=["expenses"])

MODULE = "expense"


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    branch_id: str | None = None,
    category: str | None = None,
    status_filter: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = client.table("expenses").select("*").order("created_at", desc=True)
    query = apply_branch_filter(query, scope)
    if category:
        query = query.eq("category", category)
    if status_filter:
        query = query.eq("status", status_filter)
    return query.execute().data


@router.get("/export")
def export_expenses(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("expenses").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Expenses", "expenses.xlsx")


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    data["created_by"] = user.user_id
    row = client.table("expenses").insert(data).execute().data[0]
    log_audit(client, user, "create", "expense", row["id"], {"title": row["title"]})
    return row


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: str, payload: ExpenseUpdate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("expenses").update(updates).eq("id", expense_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    log_audit(client, user, "update", "expense", expense_id, updates)
    return result.data[0]


@router.post("/{expense_id}/approve", response_model=ExpenseOut)
def approve_expense(expense_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = (
        client.table("expenses")
        .update({"status": "Approved", "approved_by": user.user_id})
        .eq("id", expense_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    log_audit(client, user, "approve", "expense", expense_id)
    return result.data[0]


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("expenses").delete().eq("id", expense_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    log_audit(client, user, "delete", "expense", expense_id)

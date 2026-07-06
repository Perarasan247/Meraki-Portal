from collections import Counter

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.scoping import apply_branch_filter, resolve_branch_id
from app.core.supabase_client import get_scoped_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(
    branch_id: str | None = None,
    year: str | None = None,
    month: str | None = None,
    program: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)

    def scoped(table: str):
        return apply_branch_filter(client.table(table).select("*"), scope)

    enquiries = scoped("enquiries").execute().data
    enrollments = scoped("enrollments").execute().data
    expenses = scoped("expenses").execute().data
    batches = scoped("batches").execute().data
    curricula = scoped("curricula").execute().data
    campaigns = scoped("campaigns").execute().data
    email_campaigns = scoped("email_campaigns").execute().data
    whatsapp_blasts = scoped("whatsapp_blasts").execute().data

    if program:
        enquiries = [e for e in enquiries if e.get("program") == program]
        enrollments = [e for e in enrollments if e.get("program") == program]

    converted = [e for e in enquiries if e["status"] == "Converted"]
    total_revenue = sum(float(e.get("paid_amount") or 0) for e in enrollments)
    total_expenses = sum(float(e.get("amount") or 0) for e in expenses)

    return {
        "module_counts": {
            "enquiry": len(enquiries),
            "enrollment": len(enrollments),
            "batch_management": len(batches),
            "batch_execution": len(
                apply_branch_filter(client.table("batch_execution").select("id"), scope).execute().data
            ),
            "curriculum": len(curricula),
            "expense": len(expenses),
            "marketing": len(campaigns),
            "reports": None,
        },
        "summary": {
            "total_enquiries": len(enquiries),
            "converted_count": len(converted),
            "students_enrolled": len(enrollments),
            "revenue": total_revenue,
            "total_expenses": total_expenses,
            "expense_records": len(expenses),
        },
        "marketing": {
            "campaigns": len(campaigns),
            "email_campaigns": len(email_campaigns),
            "whatsapp_blasts": len(whatsapp_blasts),
            "leads_tracked": sum(c.get("leads_generated") or 0 for c in campaigns),
        },
        "programs": dict(Counter(e["program"] for e in enquiries)),
    }

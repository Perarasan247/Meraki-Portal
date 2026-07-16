from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.scoping import apply_branch_filter, resolve_branch_id
from app.core.supabase_client import get_scoped_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_MONTHS = {
    m: i
    for i, m in enumerate(
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        start=1,
    )
}


def _period_range(year: str | None, month: str | None) -> tuple[str | None, str | None]:
    """Half-open [start, end) ISO range on ``created_at`` for the Year/Month
    filters. A month with no year can't form a contiguous range, so it is
    ignored (matches the practical use of the dashboard filters)."""
    if not year:
        return None, None
    y = int(year)
    m = _MONTHS.get(month) if month else None
    if m:
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end_y, end_m = (y + 1, 1) if m == 12 else (y, m + 1)
        end = datetime(end_y, end_m, 1, tzinfo=timezone.utc)
    else:
        start = datetime(y, 1, 1, tzinfo=timezone.utc)
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


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
    start, end = _period_range(year, month)

    def base(table: str, cols: str = "*", *, period: bool = True, count=None):
        q = apply_branch_filter(client.table(table).select(cols, count=count), scope)
        if period and start:
            q = q.gte("created_at", start).lt("created_at", end)
        return q

    def count_of(table: str, *, period: bool = True, program_filter: bool = False, status: str | None = None) -> int:
        # Exact total comes from the Content-Range header; the 1-row window keeps
        # transfer to a single id. NOTE: do NOT use head=True here — this client
        # version reports 0 for HEAD count requests.
        q = base(table, "id", period=period, count="exact")
        if program_filter and program:
            q = q.eq("program", program)
        if status:
            q = q.eq("status", status)
        return q.limit(1).execute().count or 0

    def column(table: str, col: str, *, program_filter: bool = False) -> list:
        # Pull a single column (DB-filtered) instead of whole rows for aggregation.
        q = base(table, col)
        if program_filter and program:
            q = q.eq("program", program)
        return q.execute().data

    total_enquiries = count_of("enquiries", program_filter=True)
    converted_count = count_of("enquiries", program_filter=True, status="Converted")
    students_enrolled = count_of("enrollments", program_filter=True)
    expense_records = count_of("expenses")

    # Sums / distribution — one column over the DB-filtered set, aggregated here.
    revenue = sum(float(r.get("paid_amount") or 0) for r in column("enrollments", "paid_amount", program_filter=True))
    total_expenses = sum(float(r.get("amount") or 0) for r in column("expenses", "amount"))
    leads_tracked = sum(int(r.get("leads_generated") or 0) for r in column("campaigns", "leads_generated"))
    programs = dict(
        Counter(r["program"] for r in column("enquiries", "program", program_filter=True) if r.get("program"))
    )

    return {
        "module_counts": {
            "enquiry": total_enquiries,
            "enrollment": students_enrolled,
            "batch_management": count_of("batches"),
            "batch_execution": count_of("batch_execution", period=False),
            "curriculum": count_of("curricula"),
            "expense": expense_records,
            "marketing": count_of("campaigns"),
            "reports": None,
        },
        "summary": {
            "total_enquiries": total_enquiries,
            "converted_count": converted_count,
            "students_enrolled": students_enrolled,
            "revenue": revenue,
            "total_expenses": total_expenses,
            "expense_records": expense_records,
        },
        "marketing": {
            "campaigns": count_of("campaigns"),
            "email_campaigns": count_of("email_campaigns"),
            "whatsapp_blasts": count_of("whatsapp_blasts"),
            "leads_tracked": leads_tracked,
        },
        "programs": programs,
    }

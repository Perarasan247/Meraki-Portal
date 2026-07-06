from collections import Counter

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.config import get_settings
from app.core.scoping import apply_branch_filter, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.report import AskRequest, AskResponse

router = APIRouter(prefix="/reports", tags=["reports"])


def _build_context(client, scope: str | None) -> dict:
    def scoped(table: str):
        return apply_branch_filter(client.table(table).select("*"), scope)

    enquiries = scoped("enquiries").execute().data
    enrollments = scoped("enrollments").execute().data
    batches = scoped("batches").execute().data
    expenses = scoped("expenses").execute().data
    campaigns = scoped("campaigns").execute().data

    return {
        "total_enquiries": len(enquiries),
        "converted_enquiries": sum(1 for e in enquiries if e.get("status") == "Converted"),
        "total_enrollments": len(enrollments),
        "total_revenue": sum(float(e.get("paid_amount") or 0) for e in enrollments),
        "total_batches": len(batches),
        "batches_by_status": dict(Counter(b.get("status") for b in batches)),
        "total_expenses": sum(float(e.get("amount") or 0) for e in expenses),
        "expense_records": len(expenses),
        "total_campaigns": len(campaigns),
        "leads_generated": sum(c.get("leads_generated") or 0 for c in campaigns),
    }


def generate_answer(question: str, context: dict) -> str:
    """
    Stub for the AI answer step. Real LLM integration (Anthropic, via
    get_settings().anthropic_api_key) is out of scope for now — swap this
    function's body for an actual `client.messages.create(...)` call fed
    `question` + `context` when that's ready; the rest of the pipeline
    (scope resolution + live stats retrieval) doesn't need to change.
    """
    return (
        "AI answering isn't configured yet (no LLM call is wired up). "
        f"Here's what we found in the live data for your question '{question}': {context}"
    )


@router.post("/ask", response_model=AskResponse)
def ask_report_question(payload: AskRequest, user: CurrentUser = Depends(get_current_user)):
    get_settings()  # would supply anthropic_api_key once real LLM call is added
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, None)
    context = _build_context(client, scope)
    answer = generate_answer(payload.question, context)
    return {"answer": answer, "data_used": context}

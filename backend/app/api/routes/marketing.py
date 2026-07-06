from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, require_module
from app.core.scoping import apply_branch_filter, log_audit, resolve_branch_id
from app.core.supabase_client import get_scoped_client
from app.models.marketing import (
    CampaignCreate,
    CampaignOut,
    CampaignUpdate,
    EmailCampaignCreate,
    EmailCampaignOut,
    LeadSourceOut,
    WhatsappBlastCreate,
    WhatsappBlastOut,
)
from app.services.excel_export import export_rows_to_xlsx

router = APIRouter(prefix="/marketing", tags=["marketing"])

MODULE = "marketing"


# ---------------------------------------------------------------------------
# campaigns
# ---------------------------------------------------------------------------
@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(
    branch_id: str | None = None,
    type_filter: str | None = None,
    status_filter: str | None = None,
    user: CurrentUser = Depends(require_module(MODULE)),
):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = client.table("campaigns").select("*").order("created_at", desc=True)
    query = apply_branch_filter(query, scope)
    if type_filter:
        query = query.eq("type", type_filter)
    if status_filter:
        query = query.eq("status", status_filter)
    return query.execute().data


@router.get("/campaigns/export")
def export_campaigns(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("campaigns").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Campaigns", "campaigns.xlsx")


@router.post("/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    row = client.table("campaigns").insert(data).execute().data[0]
    log_audit(client, user, "create", "campaign", row["id"], {"name": row["name"]})
    return row


@router.patch("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: str, payload: CampaignUpdate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    result = client.table("campaigns").update(updates).eq("id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    log_audit(client, user, "update", "campaign", campaign_id, updates)
    return result.data[0]


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    result = client.table("campaigns").delete().eq("id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    log_audit(client, user, "delete", "campaign", campaign_id)


# ---------------------------------------------------------------------------
# email campaigns
# ---------------------------------------------------------------------------
@router.get("/email", response_model=list[EmailCampaignOut])
def list_email_campaigns(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = apply_branch_filter(
        client.table("email_campaigns").select("*").order("created_at", desc=True), scope
    )
    return query.execute().data


@router.get("/email/export")
def export_email_campaigns(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("email_campaigns").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "Email Campaigns", "email_campaigns.xlsx")


@router.post("/email", response_model=EmailCampaignOut, status_code=status.HTTP_201_CREATED)
def create_email_campaign(payload: EmailCampaignCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    row = client.table("email_campaigns").insert(data).execute().data[0]
    log_audit(client, user, "create", "email_campaign", row["id"], {"subject": row["subject"]})
    return row


@router.post("/email/{email_id}/send", response_model=EmailCampaignOut)
def send_email_campaign(email_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    # Mock provider: no real email is sent, this just stamps sent_at and marks
    # everything delivered. Swap in a real ESP integration here later.
    client = get_scoped_client(user.access_token)
    existing = client.table("email_campaigns").select("*").eq("id", email_id).execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Email campaign not found")
    recipients = existing[0]["recipients_count"]
    result = (
        client.table("email_campaigns")
        .update({"sent_at": datetime.now(timezone.utc).isoformat(), "delivered_count": recipients})
        .eq("id", email_id)
        .execute()
    )
    log_audit(client, user, "send", "email_campaign", email_id)
    return result.data[0]


# ---------------------------------------------------------------------------
# whatsapp blasts
# ---------------------------------------------------------------------------
@router.get("/whatsapp", response_model=list[WhatsappBlastOut])
def list_whatsapp_blasts(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = apply_branch_filter(
        client.table("whatsapp_blasts").select("*").order("created_at", desc=True), scope
    )
    return query.execute().data


@router.get("/whatsapp/export")
def export_whatsapp_blasts(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    rows = apply_branch_filter(client.table("whatsapp_blasts").select("*"), scope).execute().data
    return export_rows_to_xlsx(rows, "WhatsApp Blasts", "whatsapp_blasts.xlsx")


@router.post("/whatsapp", response_model=WhatsappBlastOut, status_code=status.HTTP_201_CREATED)
def create_whatsapp_blast(payload: WhatsappBlastCreate, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    branch_id = payload.branch_id if user.is_super_admin and payload.branch_id else user.branch_id
    if not branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required")

    data = payload.model_dump(exclude={"branch_id"}, mode="json")
    data["branch_id"] = branch_id
    row = client.table("whatsapp_blasts").insert(data).execute().data[0]
    log_audit(client, user, "create", "whatsapp_blast", row["id"])
    return row


@router.post("/whatsapp/{blast_id}/send", response_model=WhatsappBlastOut)
def send_whatsapp_blast(blast_id: str, user: CurrentUser = Depends(require_module(MODULE))):
    # Mock provider stub — same rationale as send_email_campaign above.
    client = get_scoped_client(user.access_token)
    existing = client.table("whatsapp_blasts").select("*").eq("id", blast_id).execute().data
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "WhatsApp blast not found")
    recipients = existing[0]["recipients_count"]
    result = (
        client.table("whatsapp_blasts")
        .update({"sent_at": datetime.now(timezone.utc).isoformat(), "delivered_count": recipients})
        .eq("id", blast_id)
        .execute()
    )
    log_audit(client, user, "send", "whatsapp_blast", blast_id)
    return result.data[0]


# ---------------------------------------------------------------------------
# lead sources
# ---------------------------------------------------------------------------
@router.get("/lead-sources", response_model=list[LeadSourceOut])
def list_lead_sources(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    query = apply_branch_filter(client.table("lead_sources").select("*"), scope)
    return query.execute().data


@router.get("/lead-sources/aggregate")
def aggregate_lead_sources(branch_id: str | None = None, user: CurrentUser = Depends(require_module(MODULE))):
    client = get_scoped_client(user.access_token)
    scope = resolve_branch_id(user, branch_id)
    enquiries = apply_branch_filter(
        client.table("enquiries").select("reference_source"), scope
    ).execute().data
    counts = Counter((e.get("reference_source") or "Unknown") for e in enquiries)
    return [{"source_name": source, "count": count} for source, count in counts.items()]

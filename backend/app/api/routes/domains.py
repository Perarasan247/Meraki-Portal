"""Internship domain (track) management. Super admin authors the domain list
per branch; branch users read their own branch's domains."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.scoping import log_audit
from app.core.supabase_client import get_scoped_client, get_service_client
from app.models.domain import DomainCreate, DomainOut, DomainUpdate

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[DomainOut])
def list_domains(branch_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if user.is_super_admin:
        client = get_service_client()
        query = client.table("domains").select("*").order("label")
        if branch_id:
            query = query.eq("branch_id", branch_id)
        return query.execute().data

    # Branch users (incl. branch_admin/staff) see their own branch's domains.
    client = get_scoped_client(user.access_token)
    query = client.table("domains").select("*").order("label")
    if user.branch_id:
        query = query.eq("branch_id", user.branch_id)
    return query.execute().data


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
def create_domain(payload: DomainCreate, user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()
    try:
        row = client.table("domains").insert(payload.model_dump()).execute().data[0]
    except Exception as exc:  # unique (branch_id, key) violation
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A domain with key '{payload.key}' already exists in this branch"
        ) from exc
    log_audit(client, user, "create", "domain", row["id"], {"key": row["key"]})
    return row


@router.patch("/{domain_id}", response_model=DomainOut)
def update_domain(
    domain_id: str, payload: DomainUpdate, user: CurrentUser = Depends(require_super_admin)
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    client = get_service_client()
    res = client.table("domains").update(updates).eq("id", domain_id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Domain not found")
    return res.data[0]


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_domain(domain_id: str, user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()
    try:
        res = client.table("domains").delete().eq("id", domain_id).execute()
    except Exception as exc:  # FK violation: students/curricula still reference it
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Domain is still assigned to students or curricula; reassign them first",
        ) from exc
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Domain not found")
    log_audit(client, user, "delete", "domain", domain_id)

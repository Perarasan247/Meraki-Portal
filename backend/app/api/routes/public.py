"""Unauthenticated endpoints powering the public marketing website.

These routes are deliberately open (no auth dependency). They use the
service-role client to write past RLS, so keep the surface tiny and never
expose portal data here. Only the contact form and a read-only program list.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.core.supabase_client import get_service_client
from app.models.public import (
    PublicEnquiryCreate,
    PublicEnquiryResponse,
    PublicProgram,
)

router = APIRouter(prefix="/public", tags=["public"])


def _resolve_public_branch(client) -> str:
    """Branch that website enquiries land in: configured id, else first branch."""
    settings = get_settings()
    if settings.public_enquiry_branch_id:
        return settings.public_enquiry_branch_id
    res = client.table("branches").select("id").order("created_at").limit(1).execute()
    if not res.data:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No branch configured to receive enquiries",
        )
    return res.data[0]["id"]


@router.post("/enquiry", response_model=PublicEnquiryResponse, status_code=status.HTTP_201_CREATED)
def submit_public_enquiry(payload: PublicEnquiryCreate):
    client = get_service_client()
    branch_id = _resolve_public_branch(client)

    row = (
        client.table("enquiries")
        .insert(
            {
                "branch_id": branch_id,
                "student_name": payload.name,
                "email": payload.email,
                "mobile": payload.mobile,
                "program": payload.program,
                "reference_source": "Website",
                "status": "New",
                "notes": payload.message or None,
            }
        )
        .execute()
        .data[0]
    )
    return PublicEnquiryResponse(id=row["id"])


@router.get("/programs", response_model=list[PublicProgram])
def list_public_programs():
    """Published curricula, surfaced on the Services page. Empty if none/DB down."""
    try:
        client = get_service_client()
        rows = (
            client.table("curricula")
            .select("program,title")
            .eq("status", "Published")
            .order("program")
            .execute()
            .data
        )
    except Exception:
        return []

    seen: set[str] = set()
    out: list[PublicProgram] = []
    for r in rows:
        if r["program"] in seen:
            continue
        seen.add(r["program"])
        out.append(PublicProgram(program=r["program"], title=r["title"]))
    return out

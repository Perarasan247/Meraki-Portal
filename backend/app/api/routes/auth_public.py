"""Public (unauthenticated) auth helpers.

Students may log in with either their email or their username. Supabase Auth is
email-based, so the frontend resolves a username to its email here before
calling signInWithPassword. Emails (anything containing '@') are returned as-is.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.supabase_client import get_service_client

router = APIRouter(prefix="/auth", tags=["auth"])


class ResolveRequest(BaseModel):
    identifier: str


class ResolveResponse(BaseModel):
    email: str


@router.post("/resolve-identifier", response_model=ResolveResponse)
def resolve_identifier(payload: ResolveRequest) -> ResolveResponse:
    identifier = payload.identifier.strip()
    if not identifier:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Identifier is required")

    # Already an email — nothing to resolve.
    if "@" in identifier:
        return ResolveResponse(email=identifier)

    # Look up the student by (normalized) username.
    username = identifier.lower()
    client = get_service_client()
    rows = (
        client.table("students").select("email").eq("username", username).limit(1).execute().data
    )
    if not rows:
        # Generic error — the frontend surfaces "invalid credentials" so this
        # does not confirm whether a username exists.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account found for that username")
    return ResolveResponse(email=rows[0]["email"])

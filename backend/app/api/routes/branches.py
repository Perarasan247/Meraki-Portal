from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.supabase_client import get_scoped_client, get_service_client

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("")
def list_branches(user: CurrentUser = Depends(get_current_user)):
    if user.is_super_admin:
        client = get_service_client()
        return client.table("branches").select("*").order("name").execute().data
    client = get_scoped_client(user.access_token)
    return client.table("branches").select("*").eq("id", user.branch_id).execute().data


@router.post("", status_code=status.HTTP_201_CREATED)
def create_branch(payload: dict, user: CurrentUser = Depends(require_super_admin)):
    name = payload.get("name")
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name is required")
    client = get_service_client()
    row = (
        client.table("branches")
        .insert({"name": name, "address": payload.get("address"), "created_by": user.user_id})
        .execute()
        .data[0]
    )
    return row

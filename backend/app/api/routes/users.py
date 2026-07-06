from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import CurrentUser, get_current_user, require_super_admin
from app.core.scoping import log_audit
from app.core.supabase_client import get_scoped_client, get_service_client
from app.models.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(branch_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    if user.is_super_admin:
        client = get_service_client()
        query = client.table("profiles").select("*")
        if branch_id:
            query = query.eq("branch_id", branch_id)
        return query.execute().data

    if user.role == "branch_admin":
        client = get_scoped_client(user.access_token)
        return client.table("profiles").select("*").eq("branch_id", user.branch_id).execute().data

    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to list users")


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, user: CurrentUser = Depends(require_super_admin)):
    if payload.role != "super_admin" and not payload.branch_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "branch_id is required for this role")

    client = get_service_client()
    created = client.auth.admin.create_user(
        {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
        }
    )
    new_user_id = created.user.id

    try:
        row = (
            client.table("profiles")
            .insert(
                {
                    "id": new_user_id,
                    "branch_id": payload.branch_id,
                    "full_name": payload.full_name,
                    "email": payload.email,
                    "mobile": payload.mobile,
                    "role": payload.role,
                    "modules": payload.modules,
                    "permission_level": payload.permission_level,
                }
            )
            .execute()
            .data[0]
        )
    except Exception:
        # Avoid leaving an orphaned auth user if the profile insert fails.
        client.auth.admin.delete_user(new_user_id)
        raise

    log_audit(client, user, "create", "user", new_user_id, {"email": payload.email})
    return row


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, user: CurrentUser = Depends(get_current_user)):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")

    if user.is_super_admin:
        client = get_service_client()
    elif user.role == "branch_admin":
        client = get_scoped_client(user.access_token)
        target = client.table("profiles").select("branch_id").eq("id", user_id).execute().data
        if not target or target[0]["branch_id"] != user.branch_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot modify users outside your branch")
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to update users")

    result = client.table("profiles").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    log_audit(client, user, "update", "user", user_id, updates)
    return result.data[0]


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(user_id: str, user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()
    result = client.table("profiles").update({"is_active": False}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    log_audit(client, user, "deactivate", "user", user_id)


@router.get("/module-access-coverage")
def module_access_coverage(user: CurrentUser = Depends(require_super_admin)):
    client = get_service_client()
    profiles = client.table("profiles").select("modules").execute().data
    tally: Counter = Counter()
    for profile in profiles:
        for module in profile.get("modules") or []:
            tally[module] += 1
    return dict(tally)

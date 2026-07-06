from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.core.config import get_settings
from app.core.supabase_client import get_scoped_client

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    user_id: str
    role: str
    branch_id: str | None
    access_token: str

    @property
    def is_super_admin(self) -> bool:
        return self.role == "super_admin"


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = credentials.credentials
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    user_id = payload.get("sub")
    role = payload.get("role") or "staff"
    branch_id = payload.get("branch_id")

    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject")

    return CurrentUser(user_id=user_id, role=role, branch_id=branch_id, access_token=token)


def require_module(module: str):
    """Dependency factory: 403s unless the user's profile grants this module."""

    def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.is_super_admin:
            return user
        client = get_scoped_client(user.access_token)
        profile = (
            client.table("profiles")
            .select("modules")
            .eq("id", user.user_id)
            .single()
            .execute()
        )
        modules = (profile.data or {}).get("modules", [])
        if module not in modules:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"No access to module '{module}'")
        return user

    return _check


def require_super_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin only")
    return user

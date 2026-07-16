from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from app.core.config import get_settings
from app.core.supabase_client import get_scoped_client, get_service_client

bearer_scheme = HTTPBearer(auto_error=False)

# Cache of the project's JSON Web Key Set (public keys used to verify tokens
# signed with asymmetric algorithms like ES256/RS256).
_jwks_cache: dict = {}


def _fetch_jwks(force: bool = False) -> list[dict]:
    if force or "keys" not in _jwks_cache:
        settings = get_settings()
        resp = httpx.get(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
            headers={"apikey": settings.supabase_anon_key},
            timeout=5.0,
        )
        resp.raise_for_status()
        _jwks_cache["keys"] = resp.json().get("keys", [])
    return _jwks_cache["keys"]


def _decode_token(token: str) -> dict:
    """Verify a Supabase access token. Supports the modern asymmetric signing
    keys (ES256/RS256, verified via the project's JWKS) and the legacy HS256
    shared secret."""
    settings = get_settings()
    alg = jwt.get_unverified_header(token).get("alg", "")

    if alg.startswith(("ES", "RS", "PS", "Ed")):
        kid = jwt.get_unverified_header(token).get("kid")
        key = next((k for k in _fetch_jwks() if k.get("kid") == kid), None)
        if key is None:  # keys may have rotated — refetch once
            key = next((k for k in _fetch_jwks(force=True) if k.get("kid") == kid), None)
        if key is None:
            raise JWTError("No matching JWKS key for token")
        return jwt.decode(token, key, algorithms=[alg], audience="authenticated")

    return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")


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

    try:
        payload = _decode_token(token)
    except (JWTError, httpx.HTTPError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    user_id = payload.get("sub")
    # App role lives in `user_role` (the standard `role` claim is reserved by
    # PostgREST for the Postgres request role).
    role = payload.get("user_role") or "staff"
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


def _parse_ts(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@dataclass
class CurrentStudent:
    """A validated, non-expired, active student. Loaded from the students table
    on every student-portal request so deactivation / expiry take effect
    immediately (not only at next token refresh)."""

    id: str
    branch_id: str
    domain_id: str | None
    full_name: str
    email: str
    row: dict


def require_student(user: CurrentUser = Depends(get_current_user)) -> CurrentStudent:
    if user.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student account required")

    client = get_service_client()
    row = (
        client.table("students").select("*").eq("id", user.user_id).execute().data
    )
    if not row:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student profile not found")
    student = row[0]

    if not student.get("is_active", True):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account has been deactivated")

    expiry = _parse_ts(student.get("account_expiry"))
    if expiry is not None and expiry < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account has expired")

    return CurrentStudent(
        id=student["id"],
        branch_id=student["branch_id"],
        domain_id=student.get("domain_id"),
        full_name=student["full_name"],
        email=student["email"],
        row=student,
    )

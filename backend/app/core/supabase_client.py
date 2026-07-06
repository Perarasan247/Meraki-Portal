from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings


@lru_cache
def get_service_client() -> Client:
    """Service-role client — bypasses RLS. Admin-only server-side operations."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_scoped_client(access_token: str) -> Client:
    """
    Anon-key client with the caller's access token attached, so Postgres RLS
    policies apply exactly as they would for the browser. Used for all
    non-admin-only endpoints (defense in depth alongside the app-layer checks).
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(access_token)
    return client

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import (
    health,
    enquiries,
    enrollments,
    dashboard,
    batches,
    curricula,
    batch_execution,
    expenses,
    marketing,
    reports,
    users,
    account,
    branches,
    public,
    lms,
    domains,
    students,
    student_portal,
    auth_public,
)

settings = get_settings()

app = FastAPI(title="Meraki Portal API", version="1.0.0")

# FRONTEND_ORIGIN may be a comma-separated list; trailing slashes are stripped so
# a stray "https://site.com/" still matches the browser's "https://site.com" origin.
_allowed_origins = [
    o.strip().rstrip("/") for o in settings.frontend_origin.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Always allow any Vercel deployment (production + preview URLs) so testing
    # works regardless of the exact FRONTEND_ORIGIN value.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(health.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(enquiries.router, prefix=api_prefix)
app.include_router(enrollments.router, prefix=api_prefix)
app.include_router(batches.router, prefix=api_prefix)
app.include_router(curricula.router, prefix=api_prefix)
app.include_router(batch_execution.router, prefix=api_prefix)
app.include_router(expenses.router, prefix=api_prefix)
app.include_router(marketing.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(account.router, prefix=api_prefix)
app.include_router(branches.router, prefix=api_prefix)
app.include_router(public.router, prefix=api_prefix)
app.include_router(lms.router, prefix=api_prefix)
app.include_router(domains.router, prefix=api_prefix)
app.include_router(students.router, prefix=api_prefix)
app.include_router(student_portal.router, prefix=api_prefix)
app.include_router(auth_public.router, prefix=api_prefix)

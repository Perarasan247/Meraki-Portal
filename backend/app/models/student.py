import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,40}$")


def _normalize_username(v: str) -> str:
    # Usernames are case-insensitive and space-free so "AI Student 01" becomes
    # "ai_student_01". Login lookups always compare against this normalized form.
    v = re.sub(r"\s+", "_", v.strip().lower())
    if not USERNAME_RE.match(v):
        raise ValueError(
            "username must be 3-40 chars, letters/numbers/._- only (spaces become _)"
        )
    return v


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    username: str
    password: str = Field(min_length=8)
    mobile: str | None = None
    branch_id: str
    domain_id: str
    account_expiry: datetime | None = None  # null = never expires

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        return _normalize_username(v)


class StudentUpdate(BaseModel):
    full_name: str | None = None
    mobile: str | None = None
    domain_id: str | None = None
    # Present-with-null explicitly clears the expiry (model_dump(exclude_unset)
    # distinguishes "not sent" from "sent as null").
    account_expiry: datetime | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class StudentOut(BaseModel):
    id: str
    branch_id: str
    domain_id: str | None
    domain_label: str | None = None
    full_name: str
    email: str
    username: str | None
    mobile: str | None
    account_expiry: datetime | None
    is_active: bool
    created_at: datetime

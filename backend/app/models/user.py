from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["super_admin", "branch_admin", "staff", "custom"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    mobile: str | None = None
    role: UserRole = "staff"
    modules: list[str] = []
    permission_level: str = "custom"
    branch_id: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    mobile: str | None = None
    role: UserRole | None = None
    modules: list[str] | None = None
    permission_level: str | None = None
    branch_id: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: str
    branch_id: str | None
    full_name: str
    email: str
    mobile: str | None
    role: UserRole
    modules: list[str]
    permission_level: str
    last_login: datetime | None
    registered_at: datetime
    is_active: bool

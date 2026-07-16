from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["super_admin", "branch_admin", "trainer", "staff", "custom"]

# The super admin creates two kinds of staff accounts through this endpoint:
# branch Admins and Trainers (trainers get a limited module set). Student logins
# are created via the Students module (/students). Constraining the create schema
# means any other role is rejected with a 422.
CreatableUserRole = Literal["branch_admin", "trainer"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    mobile: str | None = None
    role: CreatableUserRole = "branch_admin"
    modules: list[str] = []
    permission_level: str = "custom"
    branch_id: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None  # changes the login email too, not just the profile
    mobile: str | None = None
    role: CreatableUserRole | None = None  # super_admin only via /transfer-super-admin
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

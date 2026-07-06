from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CurriculumStatus = Literal["Draft", "Published"]


class CurriculumPhase(BaseModel):
    id: str
    title: str
    description: str | None = None
    order: int
    estimated_duration: str | None = None


class CurriculumCreate(BaseModel):
    program: str = Field(min_length=1)
    title: str = Field(min_length=1)
    status: CurriculumStatus = "Draft"
    phases: list[CurriculumPhase] = []
    branch_id: str | None = None


class CurriculumUpdate(BaseModel):
    program: str | None = None
    title: str | None = None
    status: CurriculumStatus | None = None
    phases: list[CurriculumPhase] | None = None


class CurriculumOut(BaseModel):
    id: str
    branch_id: str
    program: str
    title: str
    status: CurriculumStatus
    phases: list[CurriculumPhase]
    created_at: datetime

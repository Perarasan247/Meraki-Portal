from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CurriculumStatus = Literal["Draft", "Published"]
# Same vocabulary as batches.scope, so a batch and its curriculum line up.
CurriculumScope = Literal["Training", "Internship", "Project"]


class CurriculumPhase(BaseModel):
    id: str
    title: str
    description: str | None = None
    order: int
    estimated_duration: str | None = None


class CurriculumCreate(BaseModel):
    program: str = Field(min_length=1)
    title: str = Field(min_length=1)
    scope: CurriculumScope = "Internship"
    status: CurriculumStatus = "Draft"
    phases: list[CurriculumPhase] = []
    branch_id: str | None = None
    domain_id: str | None = None  # internship domain this content is for


class CurriculumUpdate(BaseModel):
    program: str | None = None
    title: str | None = None
    scope: CurriculumScope | None = None
    status: CurriculumStatus | None = None
    phases: list[CurriculumPhase] | None = None
    domain_id: str | None = None


class CurriculumOut(BaseModel):
    id: str
    branch_id: str
    domain_id: str | None = None
    program: str
    title: str
    scope: CurriculumScope = "Internship"
    status: CurriculumStatus
    phases: list[CurriculumPhase]
    created_at: datetime

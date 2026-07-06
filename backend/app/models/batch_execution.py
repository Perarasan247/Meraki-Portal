from datetime import datetime
from typing import Literal

from pydantic import BaseModel

PhaseStatus = Literal["Not Started", "In Progress", "Completed"]


class PhaseProgressEntry(BaseModel):
    phase_id: str
    status: PhaseStatus = "Not Started"
    notes: str | None = None
    completed_at: datetime | None = None


class BatchExecutionCreate(BaseModel):
    batch_id: str
    curriculum_id: str
    branch_id: str | None = None


class BatchExecutionUpdate(BaseModel):
    phase_progress: list[PhaseProgressEntry]


class BatchExecutionOut(BaseModel):
    id: str
    branch_id: str
    batch_id: str
    curriculum_id: str
    phase_progress: list[PhaseProgressEntry]
    progress_pct: float
    updated_at: datetime

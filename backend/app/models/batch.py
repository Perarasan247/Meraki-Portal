from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

BatchMode = Literal["Online", "Offline", "Hybrid"]
BatchStatus = Literal["Upcoming", "Active", "Completed"]


class BatchCreate(BaseModel):
    batch_name: str = Field(min_length=1)
    program: str = Field(min_length=1)
    trainer: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    seats_total: int = 0
    seats_filled: int = 0
    mode: BatchMode = "Offline"
    status: BatchStatus = "Upcoming"
    branch_id: str | None = None


class BatchUpdate(BaseModel):
    batch_name: str | None = None
    program: str | None = None
    trainer: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    seats_total: int | None = None
    seats_filled: int | None = None
    mode: BatchMode | None = None
    status: BatchStatus | None = None


class BatchOut(BaseModel):
    id: str
    branch_id: str
    batch_name: str
    program: str
    trainer: str | None
    start_date: date | None
    end_date: date | None
    seats_total: int
    seats_filled: int
    mode: BatchMode
    status: BatchStatus
    created_at: datetime

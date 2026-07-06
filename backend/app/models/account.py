from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BackupCounts(BaseModel):
    branch_id: str | None
    enquiries: int
    enrollments: int
    batches: int
    expenses: int
    curricula: int


class BackupBundle(BaseModel):
    exported_at: datetime
    branch_id: str | None
    enquiries: list[dict[str, Any]]
    enrollments: list[dict[str, Any]]
    batches: list[dict[str, Any]]
    expenses: list[dict[str, Any]]
    curricula: list[dict[str, Any]]


class RestoreRequest(BaseModel):
    branch_id: str | None = None
    enquiries: list[dict[str, Any]] = []
    enrollments: list[dict[str, Any]] = []
    batches: list[dict[str, Any]] = []
    expenses: list[dict[str, Any]] = []
    curricula: list[dict[str, Any]] = []

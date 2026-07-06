import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

ExpenseStatus = Literal["Pending", "Approved"]


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1)
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)
    vendor: str | None = None
    date: dt.date | None = None
    notes: str | None = None
    branch_id: str | None = None


class ExpenseUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    amount: float | None = None
    vendor: str | None = None
    date: dt.date | None = None
    notes: str | None = None
    status: ExpenseStatus | None = None


class ExpenseOut(BaseModel):
    id: str
    branch_id: str
    title: str
    category: str
    amount: float
    vendor: str | None
    date: dt.date
    notes: str | None
    status: ExpenseStatus
    created_by: str | None
    approved_by: str | None
    created_at: dt.datetime

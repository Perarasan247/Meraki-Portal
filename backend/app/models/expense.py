import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

ExpenseStatus = Literal["Pending", "Approved"]
PaymentMethod = Literal[
    "Cash", "UPI", "Debit Card", "Credit Card", "Bank Transfer", "Cheque", "Other"
]


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1)
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)
    vendor: str | None = None  # paid to
    payment_method: PaymentMethod | None = None
    invoice_no: str | None = None
    date: dt.date | None = None
    notes: str | None = None
    branch_id: str | None = None


class ExpenseUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    amount: float | None = None
    vendor: str | None = None
    payment_method: PaymentMethod | None = None
    invoice_no: str | None = None
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
    payment_method: PaymentMethod | None = None
    invoice_no: str | None = None
    date: dt.date
    notes: str | None
    status: ExpenseStatus
    created_by: str | None
    approved_by: str | None
    created_at: dt.datetime

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FeeStatus = Literal["Paid", "Partial", "Pending"]


class EnrollmentCreate(BaseModel):
    student_name: str = Field(min_length=1)
    mobile: str
    program: str
    year_of_study: str | None = None
    batch_id: str | None = None
    total_fee: float = 0
    paid_amount: float = 0
    branch_id: str | None = None


class EnrollmentUpdate(BaseModel):
    student_name: str | None = None
    mobile: str | None = None
    program: str | None = None
    year_of_study: str | None = None
    batch_id: str | None = None
    total_fee: float | None = None


class PaymentRequest(BaseModel):
    amount: float = Field(gt=0)


class EnrollmentOut(BaseModel):
    id: str
    branch_id: str
    student_name: str
    mobile: str
    program: str
    year_of_study: str | None
    batch_id: str | None
    total_fee: float
    paid_amount: float
    pending_amount: float
    fee_status: FeeStatus
    created_at: datetime

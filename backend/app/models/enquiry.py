from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EnquiryStatus = Literal["New", "Contacted", "Interested", "Converted"]


class EnquiryCreate(BaseModel):
    student_name: str = Field(min_length=1)
    mobile: str = Field(min_length=7, max_length=15)
    program: str = Field(min_length=1)
    year_of_study: str | None = None
    reference_source: str | None = None
    notes: str | None = None
    branch_id: str | None = None  # super admin only; ignored for branch users


class EnquiryUpdate(BaseModel):
    student_name: str | None = None
    mobile: str | None = None
    program: str | None = None
    year_of_study: str | None = None
    reference_source: str | None = None
    notes: str | None = None
    status: EnquiryStatus | None = None


class EnquiryOut(BaseModel):
    id: str
    branch_id: str
    student_name: str
    mobile: str
    program: str
    year_of_study: str | None
    reference_source: str | None
    status: EnquiryStatus
    notes: str | None
    created_at: datetime
    converted_enrollment_id: str | None


class ConvertToEnrollmentRequest(BaseModel):
    batch_id: str | None = None
    total_fee: float = 0

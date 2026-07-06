from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CampaignType = Literal["Email", "WhatsApp", "General"]
CampaignStatus = Literal["Draft", "Active", "Completed"]


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1)
    type: CampaignType = "General"
    target_audience: str | None = None
    program: str | None = None
    budget: float = 0
    leads_generated: int = 0
    status: CampaignStatus = "Draft"
    branch_id: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    type: CampaignType | None = None
    target_audience: str | None = None
    program: str | None = None
    budget: float | None = None
    leads_generated: int | None = None
    status: CampaignStatus | None = None


class CampaignOut(BaseModel):
    id: str
    branch_id: str
    name: str
    type: CampaignType
    target_audience: str | None
    program: str | None
    budget: float | None
    leads_generated: int
    status: CampaignStatus
    created_at: datetime


class EmailCampaignCreate(BaseModel):
    campaign_id: str | None = None
    subject: str = Field(min_length=1)
    content: str = Field(min_length=1)
    recipients_count: int = 0
    branch_id: str | None = None


class EmailCampaignOut(BaseModel):
    id: str
    branch_id: str
    campaign_id: str | None
    subject: str
    content: str
    recipients_count: int
    sent_at: datetime | None
    delivered_count: int
    created_at: datetime


class WhatsappBlastCreate(BaseModel):
    campaign_id: str | None = None
    content: str = Field(min_length=1)
    recipients_count: int = 0
    branch_id: str | None = None


class WhatsappBlastOut(BaseModel):
    id: str
    branch_id: str
    campaign_id: str | None
    content: str
    recipients_count: int
    sent_at: datetime | None
    delivered_count: int
    created_at: datetime


class LeadSourceOut(BaseModel):
    id: str
    branch_id: str
    source_name: str
    count: int

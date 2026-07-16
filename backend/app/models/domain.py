import re
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class DomainCreate(BaseModel):
    branch_id: str
    # Accept an optional key; if omitted it is derived from the label. The raw
    # value can be long — it is slugified and truncated to fit the 40-char key.
    key: str | None = Field(default=None, max_length=120)
    label: str = Field(min_length=1, max_length=80)

    @model_validator(mode="after")
    def finalize_key(self) -> "DomainCreate":
        source = self.key or self.label
        slug = re.sub(r"[^a-z0-9_-]+", "-", source.strip().lower()).strip("-")
        slug = slug[:40].strip("-")
        if not slug:
            raise ValueError("Domain name must contain letters or numbers")
        self.key = slug
        return self


class DomainUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=80)


class DomainOut(BaseModel):
    id: str
    branch_id: str
    key: str
    label: str
    created_at: datetime

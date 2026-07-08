from pydantic import BaseModel, EmailStr, Field


class PublicEnquiryCreate(BaseModel):
    """Contact-form submission from the public marketing website (unauthenticated)."""

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None
    mobile: str = Field(min_length=7, max_length=15)
    program: str = Field(min_length=1, max_length=120)
    message: str | None = Field(default=None, max_length=2000)


class PublicEnquiryResponse(BaseModel):
    ok: bool = True
    id: str


class PublicProgram(BaseModel):
    program: str
    title: str

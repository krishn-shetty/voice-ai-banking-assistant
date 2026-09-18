from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr

    phone_number: str = Field(
        min_length=10,
        max_length=20,
    )

    date_of_birth: date


class LoginResponse(BaseModel):
    authenticated: bool
    session_id: UUID
    customer_id: UUID
    customer_name: str
    masked_account: str
    expires_at: datetime


class SessionResponse(BaseModel):
    authenticated: bool
    customer_id: UUID
    customer_name: str
    email: EmailStr
    phone_number: str
    expires_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )

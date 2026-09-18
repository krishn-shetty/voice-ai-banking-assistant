from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr

    phone_number: str = Field(
        min_length=10,
        max_length=20,
    )


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    phone_number: str = Field(min_length=10, max_length=20)
    date_of_birth: date
    address: str = Field(min_length=1)
    account_type: str = Field(min_length=1)
    initial_balance: float = Field(default=0, ge=0)


class LoginResponse(BaseModel):
    authenticated: bool
    session_id: UUID
    customer_id: UUID
    customer_name: str
    masked_account: str
    account_id: str | None = None
    expires_at: datetime


class SessionResponse(BaseModel):
    authenticated: bool
    customer_id: UUID
    customer_name: str
    email: EmailStr
    phone_number: str
    account_id: str | None = None
    expires_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )

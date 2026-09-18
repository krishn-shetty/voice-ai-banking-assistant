from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CustomerAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: UUID
    full_name: str
    account_id: str
    balance: Decimal
    emi_due_date: date
    emi_amount: Decimal
    loan_status: str


class CustomerCallContext(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    transcript: str
    summary_json: dict
    outcome: str
    escalated: bool
    created_at: datetime


class CustomerPaymentPromiseContext(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    call_id: UUID
    promised_amount: Decimal
    promised_date: datetime


class CustomerContextResponse(BaseModel):
    customer_id: UUID
    full_name: str
    account_id: str
    balance: Decimal
    emi_due_date: date
    emi_amount: Decimal
    loan_status: str
    calls: list[CustomerCallContext]
    payment_promises: list[CustomerPaymentPromiseContext]

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CallCreate(BaseModel):
    """
    Create a call for the currently authenticated customer.

    customer_id is intentionally not accepted.
    """

    transcript: str = ""
    summary_json: dict[str, Any] | None = None
    outcome: str | None = Field(
        default=None,
        max_length=100,
    )


class CallResponse(BaseModel):
    id: UUID
    customer_id: UUID
    transcript: str
    summary_json: dict[str, Any] | None
    outcome: str | None
    escalated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentPromiseCreate(BaseModel):
    """
    Create a payment promise.

    customer_id is intentionally not accepted.
    The backend derives customer identity from the authenticated session.
    """

    call_id: UUID

    promised_amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    promised_date: date


class PaymentPromiseResponse(BaseModel):
    id: UUID
    call_id: UUID
    customer_id: UUID
    promised_amount: Decimal
    promised_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EscalationCreate(BaseModel):
    department: str | None = Field(
        default=None,
        max_length=100,
    )


class InternalCallCreate(BaseModel):
    """
    Payload used only by the trusted voice agent.
    """

    customer_id: UUID

    transcript: str = ""

    outcome: str | None = Field(
        default=None,
        max_length=100,
    )


class InternalEscalationCreate(BaseModel):
    """
    Payload used only by the trusted voice agent.
    """

    reason: str = Field(
        default="Customer requested human assistance.",
        max_length=500,
    )

    department: str | None = Field(
        default=None,
        max_length=100,
    )


class InternalSummaryCreate(BaseModel):
    """
    Final transcript submitted by the trusted voice agent.
    """

    transcript: str = Field(
        min_length=1,
        max_length=100_000,
    )

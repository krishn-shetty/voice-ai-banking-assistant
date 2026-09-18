from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.message import CallMessage


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    transcript: Mapped[str] = mapped_column(
        String,
        default="",
    )

    summary_json: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
    )

    outcome: Mapped[str] = mapped_column(
        String(500),
        default="",
    )

    escalated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    customer: Mapped["Customer"] = relationship(
        back_populates="calls",
    )

    payment_promises: Mapped[list["PaymentPromise"]] = relationship(
        back_populates="call",
    )

    messages: Mapped[list["CallMessage"]] = relationship(
        back_populates="call",
        cascade="all, delete-orphan",
        order_by="CallMessage.sequence",
    )


class PaymentPromise(Base):
    __tablename__ = "payment_promises"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    call_id: Mapped[UUID] = mapped_column(
        ForeignKey("calls.id"),
        nullable=False,
        index=True,
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    promised_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    promised_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    call: Mapped["Call"] = relationship(
        back_populates="payment_promises",
    )

    customer: Mapped["Customer"] = relationship()

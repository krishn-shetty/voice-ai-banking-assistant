from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.customer import Customer


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    emi_due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    emi_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    loan_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="current",
    )
    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    customer: Mapped["Customer"] = relationship(
        back_populates="loans",
    )

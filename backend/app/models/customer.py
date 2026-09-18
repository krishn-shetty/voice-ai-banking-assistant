from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.call import Call
    from app.models.loan import Loan
    from app.models.session import AuthSession


CASCADE_DELETE = "all, delete-orphan"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    full_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )

    phone_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    date_of_birth: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default="",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    accounts: Mapped[list["Account"]] = relationship(
        back_populates="customer",
        cascade=CASCADE_DELETE,
    )

    loans: Mapped[list["Loan"]] = relationship(
        back_populates="customer",
        cascade=CASCADE_DELETE,
    )

    calls: Mapped[list["Call"]] = relationship(
        back_populates="customer",
        cascade=CASCADE_DELETE,
    )

    auth_sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="customer",
        cascade=CASCADE_DELETE,
    )

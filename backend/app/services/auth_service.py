from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AuthSession, Customer

SESSION_DURATION_HOURS = 8


class AuthenticationError(Exception):
    """Raised when customer authentication fails."""


class SessionNotFoundError(Exception):
    """Raised when an authentication session is invalid."""


def normalize_phone(phone_number: str) -> str:
    return "".join(
        character
        for character in phone_number
        if character.isdigit() or character == "+"
    )


def mask_account_id(account_id: str) -> str:
    if len(account_id) <= 4:
        return "XXXX"

    return f"XXXX{account_id[-4:]}"


async def authenticate_customer(
    db: AsyncSession,
    *,
    email: str,
    phone_number: str,
) -> Customer | None:
    normalized_email = email.strip().lower()
    normalized_phone = normalize_phone(phone_number)

    statement = (
        select(Customer)
        .options(
            selectinload(Customer.accounts),
        )
        .where(
            Customer.email == normalized_email,
            Customer.phone_number == normalized_phone,
        )
    )

    result = await db.execute(statement)

    return result.scalar_one_or_none()


async def create_session(
    db: AsyncSession,
    customer_id: UUID,
) -> AuthSession:
    now = datetime.now(timezone.utc)

    session = AuthSession(
        customer_id=customer_id,
        expires_at=now
        + timedelta(
            hours=SESSION_DURATION_HOURS,
        ),
    )

    db.add(session)

    await db.flush()

    return session


async def get_session(
    db: AsyncSession,
    session_id: UUID,
) -> AuthSession:
    now = datetime.now(timezone.utc)

    statement = (
        select(AuthSession)
        .options(
            selectinload(AuthSession.customer),
        )
        .where(
            AuthSession.id == session_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
    )

    result = await db.execute(statement)
    session = result.scalar_one_or_none()

    if session is None:
        raise SessionNotFoundError(
            "Authentication session is invalid or expired.",
        )

    return session


async def revoke_session(
    db: AsyncSession,
    session: AuthSession,
) -> None:
    session.revoked_at = datetime.now(timezone.utc)

    await db.flush()


def get_customer_masked_account(
    customer: Customer,
) -> str:
    if not customer.accounts:
        return "XXXX"

    return mask_account_id(
        customer.accounts[0].account_id,
    )

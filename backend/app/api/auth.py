from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import AuthSession, Customer
from app.schemas.auth import LoginRequest, LoginResponse, SessionResponse
from app.services.auth_service import (
    authenticate_customer,
    create_session,
    revoke_session,
)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)

bearer_scheme = HTTPBearer(
    auto_error=False,
)


async def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme,
    ),
    db: AsyncSession = Depends(get_db),
) -> AuthSession:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication required.",
        )

    try:
        session_id = UUID(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session.",
        ) from exc

    now = datetime.now(timezone.utc)

    result = await db.execute(
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

    session = result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired.",
        )

    return session


def get_current_customer(
    current_session: AuthSession = Depends(get_current_session),
) -> Customer:
    return current_session.customer


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    customer = await authenticate_customer(
        db=db,
        email=str(payload.email),
        phone_number=payload.phone_number,
        date_of_birth=payload.date_of_birth,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    session = await create_session(
        db=db,
        customer_id=customer.id,
    )

    await db.commit()
    await db.refresh(session)

    account_id = customer.accounts[0].account_id if customer.accounts else None

    masked_account = f"XXXX{account_id[-4:]}" if account_id else "XXXX"

    return LoginResponse(
        authenticated=True,
        session_id=session.id,
        customer_id=customer.id,
        customer_name=customer.full_name,
        masked_account=masked_account,
        expires_at=session.expires_at,
    )


@router.get(
    "/me",
    response_model=SessionResponse,
)
async def get_current_customer_info(
    current_session: AuthSession = Depends(get_current_session),
) -> SessionResponse:
    customer = current_session.customer

    return SessionResponse(
        authenticated=True,
        customer_id=customer.id,
        customer_name=customer.full_name,
        email=customer.email,
        phone_number=customer.phone_number,
        expires_at=current_session.expires_at,
    )


@router.post("/logout")
async def logout(
    current_session: AuthSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await revoke_session(
        db=db,
        session=current_session,
    )

    await db.commit()

    return {
        "message": "Logged out successfully.",
    }

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Account, AuthSession, Customer
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SessionResponse,
)
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


@router.post(
    "/register",
    response_model=LoginResponse,
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    import uuid

    from app.services.auth_service import normalize_phone

    normalized_email = payload.email.strip().lower()
    normalized_phone = normalize_phone(payload.phone_number)

    # Check if exists
    result = await db.execute(
        select(Customer).where(
            (Customer.email == normalized_email) | (Customer.phone_number == normalized_phone)
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this email or phone number already exists.",
        )

    # Create customer
    customer = Customer(
        full_name=payload.full_name,
        email=normalized_email,
        phone_number=normalized_phone,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
    )
    db.add(customer)
    await db.flush()

    # Create account
    account_id_str = f"AC{uuid.uuid4().hex[:8].upper()}"
    account = Account(
        account_id=account_id_str,
        account_type=payload.account_type,
        balance=payload.initial_balance,
        customer_id=customer.id,
    )
    db.add(account)
    await db.flush()

    # Create session
    session = await create_session(
        db=db,
        customer_id=customer.id,
    )
    await db.commit()
    await db.refresh(session)

    masked_account = f"XXXX{account_id_str[-4:]}"

    return LoginResponse(
        authenticated=True,
        session_id=session.id,
        customer_id=customer.id,
        customer_name=customer.full_name,
        masked_account=masked_account,
        account_id=account_id_str,
        expires_at=session.expires_at,
    )


@router.get(
    "/me",
    response_model=SessionResponse,
)
async def get_current_customer_info(
    current_session: AuthSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    customer = current_session.customer

    # Fetch accounts to get the first account ID
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Customer)
        .options(selectinload(Customer.accounts))
        .where(Customer.id == customer.id)
    )
    loaded_customer = result.scalar_one_or_none()
    
    account_id = None
    if loaded_customer and loaded_customer.accounts:
        account_id = loaded_customer.accounts[0].account_id

    return SessionResponse(
        authenticated=True,
        customer_id=customer.id,
        customer_name=customer.full_name,
        email=customer.email,
        phone_number=customer.phone_number,
        account_id=account_id,
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

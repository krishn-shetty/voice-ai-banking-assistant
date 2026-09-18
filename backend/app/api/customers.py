from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_customer
from app.core.service_auth import verify_agent_service_token
from app.db import get_db
from app.models import Account, Call, Customer, Loan
from app.schemas.customer import (
    CustomerAccountResponse,
    CustomerCallContext,
    CustomerContextResponse,
    CustomerPaymentPromiseContext,
)

router = APIRouter(
    prefix="/customers",
    tags=["customers"],
)

DbSession = Annotated[
    AsyncSession,
    Depends(get_db),
]

CurrentCustomer = Annotated[
    Customer,
    Depends(get_current_customer),
]

ACCOUNT_NOT_FOUND = "Account not found"
LOAN_NOT_FOUND = "Loan information not found"
ACCOUNT_ID_REQUIRED = "Account ID is required."
RECENT_CONTEXT_LIMIT = 5


# ---------------------------------------------------------------------------
# Customer-facing account endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/{account_id}",
    response_model=CustomerAccountResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Account not found",
        },
    },
)
async def get_customer_by_account(
    account_id: str,
    db: DbSession,
    current_customer: CurrentCustomer,
) -> CustomerAccountResponse:
    """
    Return account information for the authenticated customer.

    Authorization is enforced by matching the account's customer_id
    against the authenticated session's customer_id.
    """

    normalized_account_id = account_id.strip().upper()

    if not normalized_account_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ACCOUNT_ID_REQUIRED,
        )

    statement = (
        select(Customer, Account, Loan)
        .join(
            Account,
            Account.customer_id == Customer.id,
        )
        .join(
            Loan,
            Loan.customer_id == Customer.id,
        )
        .where(
            Account.account_id == normalized_account_id,
            Account.customer_id == current_customer.id,
        )
    )

    result = await db.execute(statement)
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ACCOUNT_NOT_FOUND,
        )

    customer, account, loan = row

    return CustomerAccountResponse(
        customer_id=customer.id,
        full_name=customer.full_name,
        account_id=account.account_id,
        balance=account.balance,
        emi_due_date=loan.emi_due_date,
        emi_amount=loan.emi_amount,
        loan_status=loan.loan_status,
    )


# ---------------------------------------------------------------------------
# Customer-facing context endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/{account_id}/context",
    response_model=CustomerContextResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Account not found",
        },
    },
)
async def get_customer_context(
    account_id: str,
    db: DbSession,
    current_customer: CurrentCustomer,
) -> CustomerContextResponse:
    """
    Return the authenticated customer's account and recent call context.

    This endpoint is intentionally scoped to the authenticated customer.
    A customer cannot request another customer's context by changing the
    account_id in the URL.
    """

    normalized_account_id = account_id.strip().upper()

    if not normalized_account_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ACCOUNT_ID_REQUIRED,
        )

    statement = (
        select(Customer)
        .options(
            selectinload(Customer.accounts),
            selectinload(Customer.loans),
            selectinload(
                Customer.calls,
            ).selectinload(
                Call.payment_promises,
            ),
        )
        .join(
            Account,
            Account.customer_id == Customer.id,
        )
        .where(
            Account.account_id == normalized_account_id,
            Account.customer_id == current_customer.id,
        )
    )

    result = await db.execute(statement)
    customer = result.scalar_one_or_none()

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ACCOUNT_NOT_FOUND,
        )

    account = next(
        (
            account
            for account in customer.accounts
            if account.account_id == normalized_account_id
        ),
        None,
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ACCOUNT_NOT_FOUND,
        )

    if not customer.loans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=LOAN_NOT_FOUND,
        )

    loan = customer.loans[0]

    recent_calls = sorted(
        customer.calls,
        key=lambda call: call.created_at,
        reverse=True,
    )[:RECENT_CONTEXT_LIMIT]

    recent_payment_promises = sorted(
        (promise for call in customer.calls for promise in call.payment_promises),
        key=lambda promise: promise.promised_date,
        reverse=True,
    )[:RECENT_CONTEXT_LIMIT]

    return CustomerContextResponse(
        customer_id=customer.id,
        full_name=customer.full_name,
        account_id=account.account_id,
        balance=account.balance,
        emi_due_date=loan.emi_due_date,
        emi_amount=loan.emi_amount,
        loan_status=loan.loan_status,
        calls=[CustomerCallContext.model_validate(call) for call in recent_calls],
        payment_promises=[
            CustomerPaymentPromiseContext.model_validate(
                promise,
            )
            for promise in recent_payment_promises
        ],
    )


# ---------------------------------------------------------------------------
# Agent-only account endpoint
# ---------------------------------------------------------------------------
CALL_NOT_FOUND = "Call not found"


@router.get(
    "/internal/{account_id}",
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def get_account_for_agent(
    account_id: str,
    call_id: UUID,
    db: DbSession,
) -> dict:
    """
    Retrieve an account for the trusted voice agent.

    The account lookup is bound to the backend-created call.

    Security:
        1. Agent must possess a valid service JWT.
        2. Call must exist.
        3. Account must belong to the call's customer.
        4. Returned customer must therefore be the customer associated
           with the authenticated LiveKit session.
    """

    normalized_account_id = account_id.strip().upper()

    if not normalized_account_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ACCOUNT_ID_REQUIRED,
        )

    call_result = await db.execute(
        select(Call).where(
            Call.id == call_id,
        )
    )

    call = call_result.scalar_one_or_none()

    if call is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CALL_NOT_FOUND,
        )

    statement = (
        select(Customer, Account, Loan)
        .join(
            Account,
            Account.customer_id == Customer.id,
        )
        .outerjoin(
            Loan,
            Loan.customer_id == Customer.id,
        )
        .where(
            Account.account_id == normalized_account_id,
            Account.customer_id == call.customer_id,
        )
    )

    result = await db.execute(statement)
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ACCOUNT_NOT_FOUND,
        )

    customer, account, loan = row

    return {
        "customer_id": str(customer.id),
        "full_name": customer.full_name,
        "account_id": account.account_id,
        "balance": account.balance,
        "emi_amount": (loan.emi_amount if loan is not None else None),
        "emi_due_date": (loan.emi_due_date.isoformat() if loan is not None else None),
        "loan_status": (loan.loan_status if loan is not None else None),
    }

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_customer
from app.core.service_auth import verify_agent_service_token
from app.db import get_db
from app.models.call import Call, PaymentPromise
from app.models.message import CallMessage
from app.models.customer import Customer
from app.schemas.call import (
    CallCreate,
    CallMessageCreate,
    CallMessageResponse,
    CallResponse,
    EscalationCreate,
    InternalCallCreate,
    InternalEscalationCreate,
    InternalSummaryCreate,
    PaymentPromiseCreate,
    PaymentPromiseResponse,
)
from app.services.gemini import summarize_call

router = APIRouter(
    prefix="/calls",
    tags=["calls"],
)

CUSTOMER_NOT_FOUND = "Customer not found"
CALL_NOT_FOUND = "Call not found"
ESCALATED_TO_HUMAN = "Escalated to human"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


async def _get_owned_call(
    db: AsyncSession,
    call_id: UUID,
    customer_id: UUID,
) -> Call:
    """
    Return a call only when it belongs to the authenticated customer.
    """

    result = await db.execute(
        select(Call)
        .options(selectinload(Call.messages))
        .where(
            Call.id == call_id,
            Call.customer_id == customer_id,
        )
    )

    call = result.scalar_one_or_none()

    if call is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CALL_NOT_FOUND,
        )

    return call


async def _get_call(
    db: AsyncSession,
    call_id: UUID,
) -> Call:
    """
    Return a call by ID for trusted internal operations.
    """

    result = await db.execute(
        select(Call)
        .options(selectinload(Call.messages))
        .where(
            Call.id == call_id,
        )
    )

    call = result.scalar_one_or_none()

    if call is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CALL_NOT_FOUND,
        )

    return call


# ===========================================================================
# CUSTOMER API
# ===========================================================================


# ---------------------------------------------------------------------------
# Create call
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=CallResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_call(
    payload: CallCreate,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> Call:
    """
    Create a call for the authenticated customer.

    The customer ID is deliberately taken from the authenticated session,
    never from the request body.
    """

    call = Call(
        customer_id=current_customer.id,
        transcript=payload.transcript,
        summary_json=payload.summary_json or {},
        outcome=payload.outcome or "",
        escalated=False,
    )

    db.add(call)

    await db.commit()
    await db.refresh(call)

    return call


# ---------------------------------------------------------------------------
# Customer call history
# ---------------------------------------------------------------------------


@router.get(
    "/customer/history",
    response_model=list[CallResponse],
)
async def get_customer_call_history(
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> list[Call]:
    """
    Return only calls belonging to the authenticated customer.
    """

    result = await db.execute(
        select(Call)
        .options(selectinload(Call.messages))
        .where(
            Call.customer_id == current_customer.id,
        )
        .order_by(
            Call.created_at.desc(),
        )
    )

    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Customer payment promise history
# ---------------------------------------------------------------------------


@router.get(
    "/customer/payment-promises",
    response_model=list[PaymentPromiseResponse],
)
async def get_customer_payment_promises(
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> list[PaymentPromise]:
    """
    Return payment promises belonging to the authenticated customer.
    """

    result = await db.execute(
        select(PaymentPromise)
        .where(
            PaymentPromise.customer_id == current_customer.id,
        )
        .order_by(
            PaymentPromise.created_at.desc(),
        )
    )

    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Create customer payment promise
# ---------------------------------------------------------------------------


@router.post(
    "/payment-promises",
    response_model=PaymentPromiseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment_promise(
    payload: PaymentPromiseCreate,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> PaymentPromise:
    """
    Create a payment promise for an owned call.

    Customer identity is taken from the authenticated session.
    """

    call = await _get_owned_call(
        db=db,
        call_id=payload.call_id,
        customer_id=current_customer.id,
    )

    if payload.promised_amount <= Decimal(0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Promised amount must be greater than zero",
        )

    today = datetime.now(timezone.utc).date()

    if payload.promised_date < today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Promised date cannot be in the past",
        )

    payment_promise = PaymentPromise(
        call_id=call.id,
        customer_id=current_customer.id,
        promised_amount=payload.promised_amount,
        promised_date=payload.promised_date,
    )

    db.add(payment_promise)

    await db.commit()
    await db.refresh(payment_promise)

    return payment_promise


# ---------------------------------------------------------------------------
# Get payment promises for owned call
# ---------------------------------------------------------------------------


@router.get(
    "/{call_id}/payment-promises",
    response_model=list[PaymentPromiseResponse],
)
async def get_payment_promises(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> list[PaymentPromise]:
    """
    Return payment promises for an owned call.
    """

    call = await _get_owned_call(
        db=db,
        call_id=call_id,
        customer_id=current_customer.id,
    )

    result = await db.execute(
        select(PaymentPromise)
        .where(
            PaymentPromise.call_id == call.id,
        )
        .order_by(
            PaymentPromise.created_at.desc(),
        )
    )

    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Get owned call
# ---------------------------------------------------------------------------


@router.get(
    "/{call_id}",
    response_model=CallResponse,
)
async def get_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> Call:
    """
    Return a call only when it belongs to the authenticated customer.
    """

    return await _get_owned_call(
        db=db,
        call_id=call_id,
        customer_id=current_customer.id,
    )


# ---------------------------------------------------------------------------
# End owned call
# ---------------------------------------------------------------------------


@router.post(
    "/{call_id}/end",
    response_model=CallResponse,
)
async def end_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> Call:
    """
    Mark an owned call as completed.

    Ending a call does not escalate it.
    """

    call = await _get_owned_call(
        db=db,
        call_id=call_id,
        customer_id=current_customer.id,
    )

    if not call.outcome:
        call.outcome = "completed"

    await db.commit()
    await db.refresh(call)

    return call


# ---------------------------------------------------------------------------
# Escalate owned call
# ---------------------------------------------------------------------------


@router.post(
    "/{call_id}/escalate",
    response_model=CallResponse,
)
async def escalate_call(
    call_id: UUID,
    payload: EscalationCreate,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> Call:
    """
    Escalate an owned call to human support.
    """

    call = await _get_owned_call(
        db=db,
        call_id=call_id,
        customer_id=current_customer.id,
    )

    call.escalated = True

    if payload.department:
        call.outcome = f"escalated:{payload.department}"
    else:
        call.outcome = "escalated"

    await db.commit()
    await db.refresh(call)

    return call


# ---------------------------------------------------------------------------
# Generate customer call summary
# ---------------------------------------------------------------------------


@router.post(
    "/{call_id}/summary",
    response_model=CallResponse,
)
async def generate_call_summary(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> Call:
    """
    Generate and persist an AI summary for an owned call.
    """

    call = await _get_owned_call(
        db=db,
        call_id=call_id,
        customer_id=current_customer.id,
    )

    transcript = (call.transcript or "").strip()

    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty",
        )

    try:
        summary = await summarize_call(transcript)
    except Exception as exc:
        # Do not expose provider or implementation details.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate call summary",
        ) from exc

    was_already_escalated = bool(call.escalated)

    summary_json = summary.model_dump()

    if was_already_escalated:
        call.escalated = True
        call.outcome = ESCALATED_TO_HUMAN
        summary_json["escalation_required"] = True
    else:
        call.escalated = summary.escalation_required
        call.outcome = summary.outcome

    call.summary_json = summary_json

    await db.commit()
    await db.refresh(call)

    return call


# ===========================================================================
# AGENT SERVICE API
# ===========================================================================


# ---------------------------------------------------------------------------
# Create internal call
# ---------------------------------------------------------------------------


@router.post(
    "/internal",
    response_model=CallResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def create_internal_call(
    payload: InternalCallCreate,
    db: AsyncSession = Depends(get_db),
) -> Call:
    """
    Create a call from the trusted voice agent.

    NOTE:
        This is currently retained for compatibility with the existing
        agent implementation.

        The next security step is to create the Call from the authenticated
        LiveKit token flow and pass the bound call_id to the agent, removing
        arbitrary customer_id creation from the agent.
    """

    customer_result = await db.execute(
        select(Customer).where(
            Customer.id == payload.customer_id,
        )
    )

    customer = customer_result.scalar_one_or_none()

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CUSTOMER_NOT_FOUND,
        )

    call = Call(
        customer_id=customer.id,
        transcript=payload.transcript,
        outcome=payload.outcome or "",
        summary_json={},
        escalated=False,
    )

    db.add(call)

    await db.commit()
    await db.refresh(call)

    return call


# ---------------------------------------------------------------------------
# Create internal payment promise
# ---------------------------------------------------------------------------


@router.post(
    "/internal/payment-promises",
    response_model=PaymentPromiseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def create_internal_payment_promise(
    payload: PaymentPromiseCreate,
    db: AsyncSession = Depends(get_db),
) -> PaymentPromise:
    """
    Create a payment promise from the trusted voice agent.

    Customer identity is always derived from the call.
    """

    call = await _get_call(
        db=db,
        call_id=payload.call_id,
    )

    if payload.promised_amount <= Decimal(0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Promised amount must be greater than zero",
        )

    today = datetime.now(timezone.utc).date()

    if payload.promised_date < today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Promised date cannot be in the past",
        )

    payment_promise = PaymentPromise(
        call_id=call.id,
        customer_id=call.customer_id,
        promised_amount=payload.promised_amount,
        promised_date=datetime(
            payload.promised_date.year,
            payload.promised_date.month,
            payload.promised_date.day,
            tzinfo=timezone.utc,
        ),
    )

    db.add(payment_promise)

    await db.commit()
    await db.refresh(payment_promise)

    return payment_promise


# ---------------------------------------------------------------------------
# Internal escalation
# ---------------------------------------------------------------------------


@router.post(
    "/internal/{call_id}/escalate",
    response_model=CallResponse,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def escalate_internal_call(
    call_id: UUID,
    payload: InternalEscalationCreate,
    db: AsyncSession = Depends(get_db),
) -> Call:
    """
    Escalate a call from the trusted voice agent.
    """

    call = await _get_call(
        db=db,
        call_id=call_id,
    )

    call.escalated = True

    if payload.department:
        call.outcome = f"escalated:{payload.department}"
    else:
        call.outcome = "escalated"

    await db.commit()
    await db.refresh(call)

    return call


# ---------------------------------------------------------------------------
# Internal summary
# ---------------------------------------------------------------------------


@router.post(
    "/internal/{call_id}/summary",
    response_model=CallResponse,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def generate_internal_call_summary(
    call_id: UUID,
    payload: InternalSummaryCreate,
    db: AsyncSession = Depends(get_db),
) -> Call:
    """
    Generate and persist a summary for a call from the trusted agent.
    """

    call = await _get_call(
        db=db,
        call_id=call_id,
    )

    transcript = payload.transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty",
        )

    try:
        summary = await summarize_call(transcript)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate call summary",
        ) from exc

    was_already_escalated = bool(call.escalated)

    call.transcript = transcript

    summary_json = summary.model_dump()

    if was_already_escalated:
        call.escalated = True
        call.outcome = ESCALATED_TO_HUMAN
        summary_json["escalation_required"] = True
    else:
        call.escalated = summary.escalation_required
        call.outcome = summary.outcome

    call.summary_json = summary_json

    await db.commit()
    await db.refresh(call)

    return call


@router.post(
    "/internal/{call_id}/messages",
    response_model=CallMessageResponse,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def add_internal_call_message(
    call_id: UUID,
    payload: CallMessageCreate,
    db: AsyncSession = Depends(get_db),
) -> CallMessage:
    """
    Persist a single message (user or assistant) from the trusted voice agent.
    """
    call = await _get_call(
        db=db,
        call_id=call_id,
    )

    message = CallMessage(
        call_id=call.id,
        role=payload.role,
        content=payload.content,
    )

    db.add(message)
    await db.commit()
    await db.refresh(message)

    return message


# ---------------------------------------------------------------------------
# Internal end call
# ---------------------------------------------------------------------------


@router.post(
    "/internal/{call_id}/end",
    response_model=CallResponse,
    dependencies=[
        Depends(verify_agent_service_token),
    ],
)
async def end_internal_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Call:
    """
    Mark a call as completed from the trusted voice agent.
    """

    call = await _get_call(
        db=db,
        call_id=call_id,
    )

    if not call.outcome:
        call.outcome = "completed"

    await db.commit()
    await db.refresh(call)

    return call

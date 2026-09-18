from __future__ import annotations

import json
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from livekit import api
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_customer
from app.db import get_db
from app.models.call import Call
from app.models.customer import Customer

load_dotenv()

LIVEKIT_URL: str = os.getenv("LIVEKIT_URL") or ""
LIVEKIT_API_KEY: str | None = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET: str | None = os.getenv("LIVEKIT_API_SECRET")

if not LIVEKIT_URL:
    raise RuntimeError("LIVEKIT_URL is missing from backend .env")

if not LIVEKIT_API_KEY:
    raise RuntimeError("LIVEKIT_API_KEY is missing from backend .env")

if not LIVEKIT_API_SECRET:
    raise RuntimeError("LIVEKIT_API_SECRET is missing from backend .env")


router = APIRouter(
    tags=["livekit"],
)


# ============================================================================
# Schemas
# ============================================================================


class TokenRequest(BaseModel):
    """
    Information supplied by the authenticated browser client.

    We intentionally do not accept:
        - customer_id
        - call_id
        - room_name
        - participant_identity

    Those values must be generated and controlled by the backend.
    """

    participant_name: str = Field(
        min_length=1,
        max_length=100,
    )
    assistant_identity: str


class TokenResponse(BaseModel):
    """
    Data required by the browser to connect to LiveKit.
    """

    token: str
    url: str
    room_name: str
    participant_identity: str
    call_id: str


# ============================================================================
# LiveKit token endpoint
# ============================================================================


@router.post(
    "/livekit/token",
    response_model=TokenResponse,
)
async def create_livekit_token(
    payload: TokenRequest,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
) -> TokenResponse:
    """
    Create an authenticated LiveKit session for the current customer.

    Security model:

    1. Browser authenticates with the customer session.
    2. Backend derives customer identity from that session.
    3. Backend creates the Call record.
    4. Backend generates the LiveKit room and participant identity.
    5. Backend embeds call/customer correlation metadata.
    6. Backend returns a narrowly scoped LiveKit room token.

    The browser never chooses the customer_id, call_id, room name,
    or participant identity.
    """

    participant_name = payload.participant_name.strip()
    assistant_identity = payload.assistant_identity.strip().lower()

    # Pydantic already enforces the length constraints, but stripping can
    # result in an empty string if the input consisted only of whitespace.
    if not participant_name:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Participant name cannot be empty",
        )

    if assistant_identity not in ("kubera", "kanchana"):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assistant identity must be kubera or kanchana",
        )

    # ------------------------------------------------------------------------
    # Generate backend-controlled identifiers
    # ------------------------------------------------------------------------

    call_id = uuid4()
    room_name = f"call-{uuid4().hex}"
    participant_identity = f"customer-{uuid4().hex}"

    # ------------------------------------------------------------------------
    # Create the database call before issuing the LiveKit token
    # ------------------------------------------------------------------------

    call = Call(
        id=call_id,
        customer_id=current_customer.id,
        transcript="",
        summary_json={},
        outcome="",
        escalated=False,
    )

    db.add(call)

    await db.commit()

    # ------------------------------------------------------------------------
    # LiveKit participant metadata
    # ------------------------------------------------------------------------
    #
    # Only opaque identifiers are included.
    #
    # We do not put:
    #   - name
    #   - email
    #   - phone
    #   - DOB
    #   - account number
    #   - balance
    #   - loan information
    #
    # into LiveKit metadata.
    #
    # The agent can use these IDs to correlate its work with the backend.
    # ------------------------------------------------------------------------

    metadata = json.dumps(
        {
            "call_id": str(call_id),
            "customer_id": str(current_customer.id),
            "assistant_identity": assistant_identity,
        },
        separators=(",", ":"),
    )

    # ------------------------------------------------------------------------
    # Generate scoped LiveKit access token
    # ------------------------------------------------------------------------

    token = (
        api.AccessToken(
            LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET,
        )
        .with_identity(participant_identity)
        .with_name(participant_name)
        .with_metadata(metadata)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .to_jwt()
    )

    return TokenResponse(
        token=token,
        url=LIVEKIT_URL,
        room_name=room_name,
        participant_identity=participant_identity,
        call_id=str(call_id),
    )

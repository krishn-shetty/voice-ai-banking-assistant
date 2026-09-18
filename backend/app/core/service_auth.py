from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from dotenv import load_dotenv
from fastapi import Header, HTTPException, status

load_dotenv()

SERVICE_ISSUER = "voice-banking-api"
SERVICE_AUDIENCE = "voice-banking-agent"
SERVICE_SUBJECT = "voice-banking-agent"

JWT_ALGORITHM = "HS256"
SERVICE_TOKEN_LIFETIME = timedelta(minutes=5)


def get_agent_service_secret() -> str:
    secret = os.getenv("AGENT_SERVICE_SECRET")

    if secret is None or not secret.strip():
        raise RuntimeError(
            "AGENT_SERVICE_SECRET is not configured",
        )

    return secret


def create_agent_service_token() -> str:
    """
    Create a short-lived service JWT.

    This function is available to trusted backend-side tooling only.
    The browser must never receive the service secret or this credential.
    """

    now = datetime.now(timezone.utc)
    expires_at = now + SERVICE_TOKEN_LIFETIME

    payload: dict[str, Any] = {
        "iss": SERVICE_ISSUER,
        "sub": SERVICE_SUBJECT,
        "aud": SERVICE_AUDIENCE,
        "iat": now,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        get_agent_service_secret(),
        algorithm=JWT_ALGORITHM,
    )


def verify_agent_service_token(
    authorization: str | None = Header(default=None),
) -> None:
    """
    Verify a short-lived JWT presented by the voice agent.
    """

    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service authentication required.",
        )

    scheme, separator, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service authorization.",
        )

    try:
        payload = jwt.decode(
            token,
            get_agent_service_secret(),
            algorithms=[JWT_ALGORITHM],
            issuer=SERVICE_ISSUER,
            audience=SERVICE_AUDIENCE,
            options={
                "require": [
                    "iss",
                    "sub",
                    "aud",
                    "iat",
                    "exp",
                ],
            },
        )

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service token expired.",
        ) from exc

    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service token.",
        ) from exc

    if payload.get("sub") != SERVICE_SUBJECT:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service identity.",
        )

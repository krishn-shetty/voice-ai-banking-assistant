from __future__ import annotations

import os
import time

import jwt
from dotenv import load_dotenv

load_dotenv()


def required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"{name} is not set in the environment",
        )

    return value


LIVEKIT_URL = required_env("LIVEKIT_URL")
LIVEKIT_API_KEY = required_env("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = required_env("LIVEKIT_API_SECRET")

STT_PROVIDER = os.getenv(
    "STT_PROVIDER",
    "deepgram",
).lower()

DEEPGRAM_API_KEY = (
    required_env("DEEPGRAM_API_KEY")
    if STT_PROVIDER == "deepgram"
    else os.getenv("DEEPGRAM_API_KEY")
)

GOOGLE_API_KEY = required_env("GOOGLE_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite",
)

SARVAM_API_KEY = required_env("SARVAM_API_KEY")

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://127.0.0.1:8000",
).rstrip("/")

AGENT_SERVICE_SECRET = required_env(
    "AGENT_SERVICE_SECRET",
)

SERVICE_ISSUER = "voice-banking-api"
SERVICE_AUDIENCE = "voice-banking-agent"
SERVICE_SUBJECT = "voice-banking-agent"

SERVICE_TOKEN_LIFETIME_SECONDS = 240

SARVAM_TTS_MODEL = os.getenv(
    "SARVAM_TTS_MODEL",
    "bulbul:v3",
)

DEFAULT_ASSISTANT = os.getenv(
    "DEFAULT_ASSISTANT",
    "kubera",
).lower()

DEFAULT_LANGUAGE = os.getenv(
    "DEFAULT_LANGUAGE",
    "en-IN",
)


def create_backend_service_token(
    *,
    call_id: str | None = None,
    customer_id: str | None = None,
) -> str:
    """
    Create a short-lived service JWT for FastAPI.

    When call_id and customer_id are provided they are embedded as claims
    so the backend can enforce that the request is scoped to exactly the
    authenticated call/customer pair set at session start.
    """

    now = int(time.time())

    payload: dict = {
        "iss": SERVICE_ISSUER,
        "sub": SERVICE_SUBJECT,
        "aud": SERVICE_AUDIENCE,
        "iat": now,
        "exp": now + SERVICE_TOKEN_LIFETIME_SECONDS,
    }

    if call_id is not None:
        payload["call_id"] = call_id

    if customer_id is not None:
        payload["customer_id"] = customer_id

    return jwt.encode(
        payload,
        AGENT_SERVICE_SECRET,
        algorithm="HS256",
    )


def get_backend_headers(
    *,
    call_id: str | None = None,
    customer_id: str | None = None,
) -> dict[str, str]:
    return {
        "Authorization": (
            f"Bearer {create_backend_service_token(call_id=call_id, customer_id=customer_id)}"
        ),
        "Content-Type": "application/json",
    }

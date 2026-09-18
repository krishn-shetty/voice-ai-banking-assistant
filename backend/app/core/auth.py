import os
import secrets

from dotenv import load_dotenv
from fastapi import Header, HTTPException, status

load_dotenv()


def get_backend_api_key() -> str:
    """Return the configured backend API key."""
    api_key = os.getenv("BACKEND_API_KEY")

    if api_key is None or not api_key.strip():
        raise RuntimeError("BACKEND_API_KEY is not configured")

    return api_key


def verify_api_key(
    authorization: str | None = Header(default=None),
) -> None:
    """Verify the bearer token used by trusted backend clients."""
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    scheme, separator, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not separator or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    expected_key = get_backend_api_key()

    if not secrets.compare_digest(token, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

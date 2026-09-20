import pytest
from fastapi import HTTPException

from app.core.service_auth import (
    create_agent_service_token,
    verify_agent_service_token,
)


def test_agent_service_token_creation_and_verification():
    """Test creating and verifying internal agent service JWT tokens."""
    token = create_agent_service_token()
    assert isinstance(token, str)
    assert len(token) > 0

    # Passing Bearer token header string should succeed without raising
    auth_header = f"Bearer {token}"
    verify_agent_service_token(authorization=auth_header)


def test_invalid_agent_service_token():
    """Test that invalid or missing tokens raise HTTP 401 Unauthorized."""
    with pytest.raises(HTTPException) as exc_info:
        verify_agent_service_token(authorization="Bearer invalid.jwt.token")
    assert exc_info.value.status_code == 401

    with pytest.raises(HTTPException) as exc_info:
        verify_agent_service_token(authorization=None)
    assert exc_info.value.status_code == 401

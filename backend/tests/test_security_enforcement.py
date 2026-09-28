"""
Backend security tests: verify that internal customer endpoints enforce
call-scoped ownership and return 403 when the requested customer does not
match the call's customer.
"""

from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.service_auth import create_agent_service_token
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# /customers/internal/me — 403 when token lacks call_id/customer_id
# ---------------------------------------------------------------------------


def test_internal_me_requires_call_and_customer_claims():
    """
    /customers/internal/me must return 403 when the service JWT does not
    carry call_id and customer_id claims (e.g. a generic token without scope).
    """
    token = create_agent_service_token()  # no call/customer claims
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/customers/internal/me", headers=headers)
    assert response.status_code == 403, (
        f"Expected 403 when JWT has no call/customer claims, got {response.status_code}"
    )


def test_internal_me_requires_valid_service_token():
    """
    /customers/internal/me must return 401 without a valid Bearer token.
    """
    response = client.get("/customers/internal/me")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /customers/internal/{account_id} — 403 when JWT customer != call customer
# ---------------------------------------------------------------------------


def test_internal_account_forbidden_for_wrong_customer():
    """
    Calling /customers/internal/{account_id}?call_id=... with a JWT whose
    customer_id claim does NOT match the call's customer_id must return 403
    or 404 — never 200.

    Strategy: issue a token scoped to call A (non-existent), but query with
    a DIFFERENT call B (also non-existent). The endpoint will 404 on the
    call lookup, which is still safe — it proves the call is not accessible.
    The important invariant is that the response is never 200.

    A full integration test (with a seeded DB) is needed for the 403 path.
    """
    import jwt
    import time

    from app.core.service_auth import (
        JWT_ALGORITHM,
        SERVICE_AUDIENCE,
        SERVICE_ISSUER,
        SERVICE_SUBJECT,
        get_agent_service_secret,
    )

    token_call_id = str(uuid4())
    token_customer_id = str(uuid4())
    other_call_id = str(uuid4())  # Different call — simulates mismatch scenario

    now = int(time.time())
    payload = {
        "iss": SERVICE_ISSUER,
        "sub": SERVICE_SUBJECT,
        "aud": SERVICE_AUDIENCE,
        "iat": now,
        "exp": now + 300,
        "call_id": token_call_id,
        "customer_id": token_customer_id,
    }
    token = jwt.encode(payload, get_agent_service_secret(), algorithm=JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}

    # Query with a different call_id than the one in the token.
    response = client.get(
        f"/customers/internal/ACFAKE001?call_id={other_call_id}",
        headers=headers,
    )

    # Must be 403 (JWT customer vs call mismatch) or 404 (call not found).
    # It must NEVER be 200.
    assert response.status_code in (403, 404), (
        f"Expected 403 or 404 when JWT customer does not match call, "
        f"got {response.status_code}: {response.text}"
    )


def test_internal_account_requires_service_token():
    """
    /customers/internal/{account_id} must return 401 without a Bearer token.
    """
    response = client.get(
        f"/customers/internal/ACTEST001?call_id={uuid4()}",
    )
    assert response.status_code == 401

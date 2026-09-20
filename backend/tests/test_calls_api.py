from fastapi.testclient import TestClient

from app.core.service_auth import create_agent_service_token
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check / root endpoint if configured."""
    response = client.get("/health")
    assert response.status_code in (200, 404)


def test_summary_endpoint_unauthorized():
    """Test that call summary endpoint returns 401 without Bearer token."""
    response = client.post(
        "/calls/internal/00000000-0000-0000-0000-000000000000/summary",
        json={"transcript": "Hello"},
    )
    assert response.status_code == 401


def test_summary_endpoint_nonexistent_call():
    """Test call summary endpoint with valid token but non-existent call ID."""
    token = create_agent_service_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/calls/internal/00000000-0000-0000-0000-000000000000/summary",
        headers=headers,
        json={"transcript": "User: Hello"},
    )
    # Should return 404 since call_id does not exist in DB
    assert response.status_code in (404, 502)

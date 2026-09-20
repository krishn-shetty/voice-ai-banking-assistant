from uuid import uuid4

from app.schemas.summary import CallSummary, CallSummaryRequest, CallSummaryResponse


def test_call_summary_schema_validation():
    """Test CallSummary pydantic schema validation and default fields."""
    summary = CallSummary(
        primary_intent="check_balance",
        additional_intents=["transfer_inquiry"],
        key_details=["Account AC4EEB7BA2 verified"],
        actions_performed=["Balance checked"],
        payment_promise=None,
        conversation_highlights=["User asked for balance", "Agent confirmed ₹5,000"],
        outcome="completed",
        escalation_required=False,
    )

    assert summary.primary_intent == "check_balance"
    assert "transfer_inquiry" in summary.additional_intents
    assert summary.outcome == "completed"
    assert summary.escalation_required is False


def test_call_summary_request_response():
    """Test CallSummaryRequest and CallSummaryResponse models."""
    req = CallSummaryRequest(transcript="User: Hello\nAssistant: Hi, how can I help?")
    assert "User: Hello" in req.transcript

    call_id = uuid4()
    summary = CallSummary(primary_intent="general_banking")
    resp = CallSummaryResponse(
        call_id=call_id,
        transcript=req.transcript,
        summary=summary,
    )

    assert resp.call_id == call_id
    assert resp.summary.primary_intent == "general_banking"

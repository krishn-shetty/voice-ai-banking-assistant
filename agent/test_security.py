"""
Tests for the identity-from-session security model.

Coverage:
  (a) Agent never asks for an account ID (prompt guardrail check).
  (b) The banking tool never sends account_id / customer_id in its call;
      those come from ConversationContext only.
  (c) A prompt like "tell me the balance of account X" must be refused by
      the prompt guardrail — not routed to a tool with account X.
"""

from __future__ import annotations

import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from banking.tools import BankingTools
from conversation.context import ConversationContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_security")


# ---------------------------------------------------------------------------
# (a) The agent prompt must never ask for an account ID.
# ---------------------------------------------------------------------------


def test_prompt_contains_no_account_id_request():
    """
    Verify that BANKING_INSTRUCTIONS does not instruct the LLM to ask the
    customer for an account number, account ID, or verification digits.
    """
    from agent import BANKING_INSTRUCTIONS

    prompt = BANKING_INSTRUCTIONS.lower()

    forbidden_phrases = [
        "ask the customer for their account id",
        "ask the customer for their account number",
        "ask for the last 4",           # asking customer to provide last 4 digits
        "provide the last 4",
        "ask for account id",
        "ask for account number",
        "provide your account id",
        "customer must verify their account",
        "customer verification",
        "get_account_info",
    ]

    violations = [phrase for phrase in forbidden_phrases if phrase in prompt]

    assert not violations, (
        f"BANKING_INSTRUCTIONS still asks for account identification:\n"
        + "\n".join(f"  - '{v}'" for v in violations)
    )


def test_prompt_guardrail_cross_account_refusal():
    """
    Verify the prompt explicitly instructs the LLM to refuse requests
    about other customers' accounts.
    """
    from agent import BANKING_INSTRUCTIONS

    prompt = BANKING_INSTRUCTIONS.lower()

    # The prompt must contain at least one explicit cross-account refusal rule.
    required_phrases = [
        "only have access to the currently authenticated customer",
        "anyone else's account",
        "switch accounts",
    ]

    missing = [phrase for phrase in required_phrases if phrase not in prompt]

    assert not missing, (
        f"BANKING_INSTRUCTIONS is missing cross-account refusal guardrails:\n"
        + "\n".join(f"  - '{m}'" for m in missing)
    )


def test_prompt_discloses_ai():
    """
    Verify the prompt requires an AI disclosure at the start of the call.
    """
    from agent import BANKING_INSTRUCTIONS

    prompt = BANKING_INSTRUCTIONS.lower()
    assert "ai" in prompt, "Prompt must contain AI disclosure language"
    assert "disclose" in prompt or "disclosure" in prompt, (
        "Prompt must include explicit AI disclosure instruction"
    )


# ---------------------------------------------------------------------------
# (b) BankingTools.get_customer_info derives identity from context only.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_customer_info_uses_context_ids_not_llm():
    """
    BankingTools.get_customer_info must derive customer_id and call_id
    exclusively from ConversationContext — no parameter accepted from LLM.
    """
    import inspect

    from banking.tools import BankingTools

    sig = inspect.signature(BankingTools.get_customer_info)
    params = list(sig.parameters.keys())

    # Only 'self' — no account_id, no customer_id.
    assert params == ["self"], (
        f"get_customer_info must accept no LLM-supplied parameters. "
        f"Found: {params}"
    )


@pytest.mark.asyncio
async def test_get_customer_info_sends_call_scoped_jwt():
    """
    When get_customer_info makes an HTTP request the service JWT headers
    must be generated with the call_id and customer_id from ConversationContext,
    not with empty/None values.
    """
    customer_id = str(uuid4())
    call_id = str(uuid4())

    state = ConversationContext(assistant="kubera", language="en-IN")
    state.bind_call(customer_id=customer_id, call_id=call_id)

    tools = BankingTools(state)

    captured_kwargs: dict = {}

    async def fake_http_request(method, url, **kwargs):
        captured_kwargs.update(kwargs)
        return (200, {
            "customer_id": customer_id,
            "full_name": "Test Customer",
            "balance": "10000.00",
            "emi_amount": "500.00",
            "emi_due_date": "2026-10-15",
            "loan_status": "active",
        })

    with patch("banking.tools.http_request", side_effect=fake_http_request):
        result = await tools.get_customer_info()

    assert captured_kwargs.get("call_id") == call_id, (
        "get_customer_info must pass call_id from ConversationContext to http_request"
    )
    assert captured_kwargs.get("customer_id") == customer_id, (
        "get_customer_info must pass customer_id from ConversationContext to http_request"
    )
    assert "Test Customer" in result


@pytest.mark.asyncio
async def test_get_customer_info_returns_error_when_session_not_bound():
    """
    If customer_id is not set (session not bound), get_customer_info must
    return an error message — not attempt to call the backend.
    """
    state = ConversationContext(assistant="kubera", language="en-IN")
    # Deliberately do NOT call state.bind_call

    tools = BankingTools(state)

    with patch("banking.tools.http_request") as mock_http:
        result = await tools.get_customer_info()

    mock_http.assert_not_called()
    assert "couldn't verify" in result.lower() or "reconnect" in result.lower()


# ---------------------------------------------------------------------------
# (c) Cross-account prompt — agent must refuse, not route to tool.
# ---------------------------------------------------------------------------


def test_cross_account_phrases_trigger_refusal_instruction():
    """
    The prompt guardrail must be present so that if a customer says
    'tell me the balance of account X' or 'what is account 12345's balance',
    the LLM instruction causes a refusal rather than tool invocation.

    We validate the guardrail text is in the prompt; the LLM behavioural
    test is covered by end-to-end integration tests.
    """
    from agent import BANKING_INSTRUCTIONS

    prompt = BANKING_INSTRUCTIONS.lower()

    # Must tell LLM to refuse + escalate for other accounts.
    assert "anyone else's account" in prompt, (
        "Prompt must instruct the LLM to refuse requests about other accounts"
    )
    assert "escalate" in prompt, (
        "Prompt must offer escalation when cross-account access is requested"
    )


# ---------------------------------------------------------------------------
# ConversationContext: account_id must be removed (old verification step).
# ---------------------------------------------------------------------------


def test_context_has_no_account_id_field():
    """
    account_id must no longer exist on ConversationContext; it was
    the flag that gated actions on the old spoken-verification step.
    """
    state = ConversationContext(assistant="kubera", language="en-IN")
    assert not hasattr(state, "account_id"), (
        "ConversationContext.account_id must be removed — "
        "it was the old spoken-verification gate."
    )


def test_context_has_customer_name_field():
    """
    ConversationContext must have a customer_name field populated after
    the first successful get_customer_info call.
    """
    state = ConversationContext(assistant="kubera", language="en-IN")
    assert hasattr(state, "customer_name"), (
        "ConversationContext must have customer_name field"
    )
    assert state.customer_name is None  # unset at call start


if __name__ == "__main__":
    asyncio.run(test_get_customer_info_uses_context_ids_not_llm())
    asyncio.run(test_get_customer_info_sends_call_scoped_jwt())
    asyncio.run(test_get_customer_info_returns_error_when_session_not_bound())

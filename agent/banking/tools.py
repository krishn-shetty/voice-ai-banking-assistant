from __future__ import annotations

import asyncio
from typing import Any

import aiohttp

from config import BACKEND_URL, get_backend_headers

NOT_AVAILABLE = "not available"

CALL_NOT_IDENTIFIED_MESSAGE = (
    "I couldn't identify this banking call. Please reconnect and try again."
)


async def http_request(
    method: str,
    url: str,
    *,
    call_id: str | None = None,
    customer_id: str | None = None,
    json: dict[str, Any] | None = None,
    params: dict[str, str] | None = None,
) -> tuple[int, Any]:
    """Make an authenticated request to the banking backend.

    When call_id and customer_id are supplied they are embedded in the
    service JWT so the backend can enforce call-scoped ownership.
    """

    timeout = aiohttp.ClientTimeout(total=15)
    headers = get_backend_headers(call_id=call_id, customer_id=customer_id)

    async with aiohttp.ClientSession(
        timeout=timeout,
    ) as session:
        try:
            async with session.request(
                method,
                url,
                headers=headers,
                json=json,
                params=params,
            ) as response:
                content_type = response.headers.get(
                    "Content-Type",
                    "",
                )

                if "application/json" in content_type:
                    data = await response.json()
                else:
                    data = await response.text()

                return response.status, data

        except asyncio.TimeoutError:
            return 408, {
                "detail": "Backend request timed out",
            }

        except aiohttp.ClientError:
            return 503, {
                "detail": "Backend connection failed",
            }


class BankingTools:
    """Backend-backed banking operations available to the voice agent.

    Security guarantees
    -------------------
    * No tool method accepts a customer_id or account_id parameter.
    * All identity is derived from ConversationContext.call_id /
      ConversationContext.customer_id, which are set once at call start
      from trusted LiveKit participant metadata and never mutated by the LLM.
    * The service JWT carries call_id + customer_id claims so the backend
      can reject any request that does not match the call's owner.
    """

    def __init__(self, state) -> None:
        self.state = state

    def _scoped_headers(self) -> dict[str, str]:
        """Return auth headers with call_id + customer_id embedded in JWT."""
        return get_backend_headers(
            call_id=self.state.call_id,
            customer_id=self.state.customer_id,
        )

    async def get_customer_info(self) -> str:
        """
        Retrieve account information for the customer already bound
        to this LiveKit call.

        Identity is derived entirely from the call record on the backend;
        no account ID is supplied by the LLM.
        """

        if not self.state.customer_id:
            return (
                "I couldn't verify this banking session. "
                "Please reconnect and try again."
            )

        if not self.state.call_id:
            return CALL_NOT_IDENTIFIED_MESSAGE

        status, data = await http_request(
            "GET",
            f"{BACKEND_URL}/customers/internal/me",
            call_id=self.state.call_id,
            customer_id=self.state.customer_id,
        )

        if status == 403:
            return (
                "I couldn't verify this banking session. "
                "Please reconnect and try again."
            )

        if status == 404:
            return (
                "I couldn't find the account for this session. "
                "Please reconnect and try again."
            )

        if status != 200 or not isinstance(data, dict):
            return (
                "I couldn't retrieve the account information "
                "right now. Please try again."
            )

        # Cache the customer name so the agent can greet by name.
        full_name = data.get("full_name")
        if full_name:
            self.state.customer_name = full_name

        return (
            f"Name: {data.get('full_name', 'the customer')}. "
            f"Account balance: "
            f"{data.get('balance', NOT_AVAILABLE)}. "
            f"EMI amount: "
            f"{data.get('emi_amount', NOT_AVAILABLE)}. "
            f"EMI due date: "
            f"{data.get('emi_due_date', NOT_AVAILABLE)}. "
            f"Loan status: "
            f"{data.get('loan_status', NOT_AVAILABLE)}."
        )

    async def log_payment_promise(
        self,
        promised_amount: float,
        promised_date: str,
    ) -> str:
        """
        Record a payment promise against the backend-created call.
        """

        if not self.state.customer_id:
            return (
                "The customer needs to be verified before "
                "a payment promise can be recorded."
            )

        if not self.state.call_id:
            return CALL_NOT_IDENTIFIED_MESSAGE

        status, data = await http_request(
            "POST",
            f"{BACKEND_URL}/calls/internal/payment-promises",
            call_id=self.state.call_id,
            customer_id=self.state.customer_id,
            json={
                "call_id": self.state.call_id,
                "promised_amount": promised_amount,
                "promised_date": promised_date,
            },
        )

        if status not in (200, 201):
            print(
                f"[agent] Payment promise failed: {status} {data}",
            )

            return "I couldn't record the payment promise. Please try again."

        return (
            f"Your payment promise of {promised_amount} "
            f"for {promised_date} has been recorded successfully."
        )

    async def escalate(
        self,
        reason: str,
    ) -> str:
        """
        Escalate the existing backend-created call.
        """

        reason = reason.strip()[:500]

        if not reason:
            reason = "Customer requested human assistance."

        if not self.state.call_id:
            return CALL_NOT_IDENTIFIED_MESSAGE

        status, data = await http_request(
            "POST",
            f"{BACKEND_URL}/calls/internal/{self.state.call_id}/escalate",
            call_id=self.state.call_id,
            customer_id=self.state.customer_id,
            json={
                "reason": reason,
            },
        )

        if status not in (200, 201):
            print(
                f"[agent] Escalation backend failed: {status} {data}",
            )

            return "I couldn't complete the escalation right now. Please try again."

        self.state.escalated = True

        return "The conversation has been escalated to a human banking representative."

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
    json: dict[str, Any] | None = None,
    params: dict[str, str] | None = None,
) -> tuple[int, Any]:
    """Make an authenticated request to the banking backend."""

    timeout = aiohttp.ClientTimeout(total=15)
    headers = get_backend_headers()

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
    """Backend-backed banking operations available to the voice agent."""

    def __init__(self, state) -> None:
        self.state = state

    async def get_account_info(
        self,
        account_id: str,
    ) -> str:
        """
        Retrieve account information for the customer already bound
        to this LiveKit call.
        """

        account_id = account_id.strip().upper()

        if not account_id:
            return "Please provide your account ID."

        if not self.state.customer_id:
            return (
                "I couldn't verify this banking session. "
                "Please reconnect and try again."
            )

        if not self.state.call_id:
            return CALL_NOT_IDENTIFIED_MESSAGE

        status, data = await http_request(
            "GET",
            f"{BACKEND_URL}/customers/internal/{account_id}",
            params={
                "call_id": self.state.call_id,
            },
        )

        if status == 404:
            return (
                "I couldn't find that account. "
                "Please check the account ID and provide it again."
            )

        if status == 403:
            return (
                "I couldn't verify that account for this banking session. "
                "Please check the account ID."
            )

        if status != 200 or not isinstance(data, dict):
            return (
                "I couldn't retrieve the account information "
                "right now. Please try again."
            )

        customer_id = data.get("customer_id")

        if not customer_id:
            return "I found the account, but I couldn't verify the customer record."

        # The backend performs this ownership check as well.
        # This second check prevents the agent from accidentally
        # treating another customer's response as the current
        # customer's account.
        if str(customer_id) != self.state.customer_id:
            return (
                "I couldn't verify that account for this banking session. "
                "Please check the account ID."
            )

        self.state.account_id = account_id

        return (
            "Customer verified. "
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

        if not self.state.account_id:
            return "Please verify your account before recording a payment promise."

        if not self.state.call_id:
            return CALL_NOT_IDENTIFIED_MESSAGE

        status, data = await http_request(
            "POST",
            f"{BACKEND_URL}/calls/internal/payment-promises",
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

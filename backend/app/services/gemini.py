import logging
import os
import re

from dotenv import load_dotenv
from google import genai

from app.schemas.summary import CallSummary

load_dotenv()

logger = logging.getLogger(__name__)


def get_gemini_client() -> genai.Client:
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    return genai.Client(api_key=api_key)


def extract_json_payload(text: str) -> str:
    """
    Safely extract JSON payload from text, stripping markdown code fences or surrounding text.
    """
    text = text.strip()
    # Match markdown code block ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Match outermost json object braces { ... }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1].strip()
    return text


async def summarize_call(transcript: str) -> CallSummary:
    client = get_gemini_client()

    prompt = f"""
You are analyzing a banking customer-service call.

Extract the following information:
- primary_intent: identify the customer's main reason for the call (e.g., account_information, balance_inquiry, payment_promise, general_banking, escalation).
- additional_intents: any other topics discussed.
- key_details: important facts from the transcript.
- actions_performed: what the assistant or customer actually did.
- payment_promise: detail any promised payment (amount/date) ONLY if explicitly confirmed.
- conversation_highlights: 2-3 bullet points summarizing the key moments.
- outcome: describe how the call ended (e.g., completed, escalated, dropped).
- escalation_required: true only if the transcript indicates that human intervention is needed.

Rules:
- Do not invent customer information, amounts, or dates.
- Use only facts from the transcript.

Transcript:
{transcript}
"""

    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CallSummary,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Gemini summary generation failed with model=%s: %s. Retrying with gemini-2.0-flash",
            model,
            exc,
        )
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CallSummary,
            ),
        )

    if not response or not response.text:
        raise RuntimeError("Gemini returned an empty response")

    raw_text = extract_json_payload(response.text)
    return CallSummary.model_validate_json(raw_text)


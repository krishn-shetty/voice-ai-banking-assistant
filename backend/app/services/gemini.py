import os

from dotenv import load_dotenv
from google import genai

from app.schemas.summary import CallSummary

load_dotenv()


def get_gemini_client() -> genai.Client:
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    return genai.Client(api_key=api_key)


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

    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CallSummary,
        ),
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    return CallSummary.model_validate_json(response.text)

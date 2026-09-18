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

Return ONLY valid JSON matching this exact structure:

{{
  "intent": "string",
  "key_details": ["string"],
  "outcome": "string",
  "escalation_required": true
}}

Rules:
- intent: identify the customer's main reason for the call.
- key_details: list only important facts from the transcript.
- outcome: describe how the call ended.
- escalation_required: true only if the transcript indicates that human intervention is needed.
- Do not invent customer information.
- Do not include markdown.
- Do not include any text outside the JSON object.

Transcript:
{transcript}
"""

    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    return CallSummary.model_validate_json(response.text)

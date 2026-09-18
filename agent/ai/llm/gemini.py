from livekit.plugins import google

from config import GEMINI_MODEL


def create_llm():
    return google.LLM(
        model=GEMINI_MODEL,
    )
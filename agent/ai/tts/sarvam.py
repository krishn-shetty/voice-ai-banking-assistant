"""
Production Sarvam TTS integration.

This module intentionally uses the official LiveKit Sarvam plugin instead
of implementing a custom Sarvam WebSocket/audio pipeline.

The official plugin is responsible for:
- Sarvam API authentication
- WebSocket connection management
- Streaming TTS responses
- Audio decoding
- LiveKit audio frame generation
- Connection cleanup
"""

from __future__ import annotations

import logging

from livekit.plugins import sarvam

from config import SARVAM_API_KEY, SARVAM_TTS_MODEL

logger = logging.getLogger("voice-banking-agent.tts.sarvam")


SPEAKER_MAP: dict[str, str] = {
    "kubera": "shubh",
    "kanchan": "priya",
}


DEFAULT_SAMPLE_RATE = 22050
DEFAULT_CHANNELS = 1
DEFAULT_PACE = 1.0
DEFAULT_PITCH = 0.0
DEFAULT_LOUDNESS = 1.0
DEFAULT_TEMPERATURE = 0.6
DEFAULT_BITRATE = "128k"
DEFAULT_MIN_BUFFER_SIZE = 50
DEFAULT_MAX_CHUNK_LENGTH = 150


def get_speaker(assistant: str) -> str:
    """
    Return the configured Sarvam speaker for an assistant persona.
    """
    normalized = assistant.strip().lower()

    speaker = SPEAKER_MAP.get(normalized)

    if speaker is None:
        supported = ", ".join(sorted(SPEAKER_MAP))

        raise ValueError(
            f"Unsupported Sarvam assistant '{assistant}'. "
            f"Supported assistants: {supported}"
        )

    return speaker


def _normalize_language(language: str) -> str:
    # NOTE: only strip whitespace - do NOT lowercase. Sarvam's
    # target_language_code is case-sensitive ("en-IN", not "en-in").
    # Lowercasing here was the actual bug: it silently corrupted every
    # language code passed through this module.
    normalized = language.strip()
    return normalized or "en-IN"


def create_tts(
    *,
    assistant: str = "kubera",
    language: str = "en-IN",
) -> sarvam.TTS:
    """
    Create the production Sarvam TTS instance.
    """
    normalized_language = _normalize_language(language)
    speaker = get_speaker(assistant)

    logger.info(
        "Creating Sarvam TTS: assistant=%s speaker=%s language=%s model=%s",
        assistant,
        speaker,
        normalized_language,
        SARVAM_TTS_MODEL,
    )

    return sarvam.TTS(
        api_key=SARVAM_API_KEY,
        model=SARVAM_TTS_MODEL,
        target_language_code=normalized_language,
        speaker=speaker,
        speech_sample_rate=DEFAULT_SAMPLE_RATE,
        num_channels=DEFAULT_CHANNELS,
        pitch=DEFAULT_PITCH,
        pace=DEFAULT_PACE,
        loudness=DEFAULT_LOUDNESS,
        temperature=DEFAULT_TEMPERATURE,
        output_audio_bitrate=DEFAULT_BITRATE,
        min_buffer_size=DEFAULT_MIN_BUFFER_SIZE,
        max_chunk_length=DEFAULT_MAX_CHUNK_LENGTH,
        enable_preprocessing=False,
        send_completion_event=True,
        output_audio_codec="mp3",
    )


def update_tts(
    tts: sarvam.TTS,
    *,
    assistant: str,
    language: str,
) -> None:
    """
    Update an existing Sarvam TTS instance when the persona or language
    changes during a conversation.
    """
    normalized_language = _normalize_language(language)
    speaker = get_speaker(assistant)

    logger.info(
        "Updating Sarvam TTS: assistant=%s speaker=%s language=%s",
        assistant,
        speaker,
        normalized_language,
    )

    tts.update_options(
        target_language_code=normalized_language,
        speaker=speaker,
    )


__all__ = [
    "SPEAKER_MAP",
    "create_tts",
    "get_speaker",
    "update_tts",
]
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

PERSONAS = {
    "kanchana": {
        "name": "Kanchan",
        "gender": "female",
        "aliases": {
            "kanchan",
            "kancchan",
            "kanshan",
            "khanchhan",
        },
    },
    "kubera": {
        "name": "Kubera",
        "gender": "male",
        "aliases": {
            "kubera",
            "kuber",
            "kuberan",
        },
    },
}


LANGUAGE_CODES = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "kannada": "kn-IN",
    "tamil": "ta-IN",
    "telugu": "te-IN",
    "malayalam": "ml-IN",
    "marathi": "mr-IN",
    "bengali": "bn-IN",
    "gujarati": "gu-IN",
    "punjabi": "pa-IN",
    "odia": "od-IN",
}


BARE_LANGUAGE_CODES = {
    "en": "en-IN",
    "hi": "hi-IN",
    "kn": "kn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
    "od": "od-IN",
    "or": "od-IN",
}


PERSONA_GENDER_ALIASES = {
    "male": {"male", "man", "boy"},
    "female": {"female", "woman", "girl"},
}


def _find_persona_by_alias(value: str) -> str | None:
    for persona_id, persona in PERSONAS.items():
        if value in persona["aliases"]:
            return persona_id

    return None


def _find_persona_by_gender(value: str) -> str | None:
    for gender, aliases in PERSONA_GENDER_ALIASES.items():
        if value not in aliases:
            continue

        for persona_id, persona in PERSONAS.items():
            if persona["gender"] == gender:
                return persona_id

    return None


@dataclass
class ConversationContext:
    assistant: str = "kubera"
    language: str = "en-IN"
    detected_language: str | None = None

    # These two values are established by the authenticated backend/LiveKit
    # session. They must not be selected by the LLM.
    customer_id: str | None = None
    call_id: str | None = None

    # This value is established only after account verification.
    account_id: str | None = None

    escalated: bool = False
    transcript: list[str] = field(default_factory=list)

    def bind_call(
        self,
        *,
        customer_id: str,
        call_id: str,
    ) -> None:
        """
        Bind the conversation to the backend-created customer/call.

        These identifiers come from trusted LiveKit participant metadata
        created by the backend. They are never supplied by the LLM.
        """

        normalized_customer_id = customer_id.strip()
        normalized_call_id = call_id.strip()

        if not normalized_customer_id:
            raise ValueError(
                "LiveKit metadata is missing customer_id",
            )

        if not normalized_call_id:
            raise ValueError(
                "LiveKit metadata is missing call_id",
            )

        # Validate that both values are UUIDs.
        UUID(normalized_customer_id)
        UUID(normalized_call_id)

        self.customer_id = normalized_customer_id
        self.call_id = normalized_call_id

    def set_assistant(self, value: str) -> None:
        normalized = value.strip().lower()

        if normalized in PERSONAS:
            self.assistant = normalized
            return

        persona_id = _find_persona_by_alias(normalized)

        if persona_id is not None:
            self.assistant = persona_id
            return

        persona_id = _find_persona_by_gender(normalized)

        if persona_id is not None:
            self.assistant = persona_id

    def set_language(self, language: str | None) -> None:
        if not language:
            return

        normalized = str(language).strip()

        if not normalized or normalized.lower() == "multi":
            return

        if normalized in LANGUAGE_CODES.values():
            self.language = normalized
            self.detected_language = normalized
            return

        lowered = normalized.lower()

        if lowered in LANGUAGE_CODES:
            self.language = LANGUAGE_CODES[lowered]
            self.detected_language = self.language
            return

        base = lowered.split("-")[0]

        if base in BARE_LANGUAGE_CODES:
            self.language = BARE_LANGUAGE_CODES[base]
            self.detected_language = self.language

    def current_persona(self) -> dict:
        return PERSONAS[self.assistant]

    def persona_name(self) -> str:
        return self.current_persona()["name"]
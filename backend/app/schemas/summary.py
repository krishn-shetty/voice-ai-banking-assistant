from uuid import UUID

from pydantic import BaseModel, Field


class CallSummary(BaseModel):
    primary_intent: str = Field(min_length=1)
    additional_intents: list[str] = Field(default_factory=list)
    key_details: list[str] = Field(default_factory=list)
    actions_performed: list[str] = Field(default_factory=list)
    payment_promise: str | None = Field(default=None)
    conversation_highlights: list[str] = Field(default_factory=list)
    outcome: str = Field(min_length=1)
    escalation_required: bool


class CallSummaryRequest(BaseModel):
    transcript: str = Field(min_length=1)


class CallSummaryResponse(BaseModel):
    call_id: UUID
    transcript: str
    summary: CallSummary

from uuid import UUID

from pydantic import BaseModel, Field


class CallSummary(BaseModel):
    intent: str = Field(min_length=1)
    key_details: list[str] = Field(default_factory=list)
    outcome: str = Field(min_length=1)
    escalation_required: bool


class CallSummaryRequest(BaseModel):
    transcript: str = Field(min_length=1)


class CallSummaryResponse(BaseModel):
    call_id: UUID
    transcript: str
    summary: CallSummary

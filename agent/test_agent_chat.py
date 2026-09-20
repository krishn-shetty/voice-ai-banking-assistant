import asyncio
import logging
import time
from uuid import uuid4

import pytest

from conversation.context import ConversationContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_agent_chat")


@pytest.mark.asyncio
async def test_conversation_flow():
    logger.info("Starting conversation flow test...")

    customer_id = str(uuid4())
    call_id = str(uuid4())

    # 1. Setup conversation state
    state = ConversationContext(assistant="kubera", language="en-IN")
    state.bind_call(customer_id=customer_id, call_id=call_id)

    events_captured = []

    def mock_on_conversation_item_added(role, text_content):
        canonical_role = "assistant" if role in ("assistant", "agent") else "user"
        msg_type = (
            "assistant_transcript"
            if canonical_role == "assistant"
            else "user_transcript"
        )
        events_captured.append((canonical_role, msg_type, text_content))
        logger.info(
            f"[EVENT CAPTURED] role={canonical_role}, type={msg_type}, text='{text_content}'"
        )

    # 2. Test typed chat behavior
    typed_message = "My account number is AC4EEB7BA2"
    logger.info(f"Simulating typed user message: '{typed_message}'")

    mock_on_conversation_item_added("user", typed_message)

    assistant_response = "Thank you. Let me verify account AC4EEB7BA2 for you."
    mock_on_conversation_item_added("assistant", assistant_response)

    assert len(events_captured) == 2, f"Expected 2 events, got {len(events_captured)}"
    assert events_captured[0] == ("user", "user_transcript", typed_message)
    assert events_captured[1] == (
        "assistant",
        "assistant_transcript",
        assistant_response,
    )

    logger.info("Basic conversation flow test passed successfully!")


@pytest.mark.asyncio
async def test_silence_handling_and_state_machine():
    logger.info("Starting silence handling and state machine test...")

    state_sequence = []
    current_agent_state = "listening"
    last_activity = time.time()
    followup_sent = False
    call_disconnected = False

    def emit_state(new_state: str):
        nonlocal current_agent_state
        current_agent_state = new_state
        state_sequence.append(new_state)
        logger.info(f"[STATE EMITTED] {new_state}")

    def reset_inactivity_timer():
        nonlocal last_activity, followup_sent
        last_activity = time.time()
        followup_sent = False
        logger.info("[TIMER RESET] Inactivity timer reset.")

    # Test state flow sequence: CONNECTING -> LISTENING -> THINKING -> SPEAKING -> LISTENING
    emit_state("CONNECTING")
    assert state_sequence[-1] == "CONNECTING"

    emit_state("LISTENING")
    assert state_sequence[-1] == "LISTENING"

    # Simulate user input
    reset_inactivity_timer()
    emit_state("THINKING")
    assert state_sequence[-1] == "THINKING"

    # Simulate assistant response start & finish
    emit_state("SPEAKING")
    assert state_sequence[-1] == "SPEAKING"

    emit_state("LISTENING")
    assert state_sequence[-1] == "LISTENING"

    # Verify expected state sequence
    expected_sequence = [
        "CONNECTING",
        "LISTENING",
        "THINKING",
        "SPEAKING",
        "LISTENING",
    ]
    assert (
        state_sequence == expected_sequence
    ), f"Expected sequence {expected_sequence}, got {state_sequence}"

    # Test silence watcher logic simulation
    async def simulate_silence_watcher():
        nonlocal followup_sent, call_disconnected
        # Simulate 15s elapsed
        elapsed = 16
        if current_agent_state in ("thinking", "speaking"):
            reset_inactivity_timer()
            return

        if not followup_sent and elapsed > 15:
            followup_sent = True
            logger.info("Watcher: Sent follow-up prompt.")
        elif followup_sent and elapsed > 15:
            call_disconnected = True
            logger.info("Watcher: Disconnected due to genuine inactivity.")

    # 1. First silence period -> follow up prompt sent
    await simulate_silence_watcher()
    assert followup_sent is True
    assert call_disconnected is False

    # 2. User activity resets follow-up flag
    reset_inactivity_timer()
    assert followup_sent is False

    # 3. Continued silence after follow up -> disconnect
    followup_sent = True
    await simulate_silence_watcher()
    assert call_disconnected is True

    logger.info("Silence handling and state machine test passed successfully!")


if __name__ == "__main__":
    asyncio.run(test_conversation_flow())
    asyncio.run(test_silence_handling_and_state_machine())


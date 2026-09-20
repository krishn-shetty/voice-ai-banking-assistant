from livekit.plugins import deepgram


def create_stt():
    return deepgram.STT(
        model="nova-3",
        language="multi",
        # ------------------------------------------------------------------
        # Turn-detection tuning: prevent mid-utterance splitting
        # ------------------------------------------------------------------
        # Deepgram waits 500 ms of silence before finalizing a segment
        # (default was 25 ms — far too aggressive for dictating account IDs).
        endpointing_ms=500,
        # Deepgram emits UtteranceEnd only after 1.5 s of silence,
        # giving the user time to pause between alphanumeric clusters.
        utterance_end_ms=1500,
        # Better formatting for numbers, dates, and currency amounts.
        smart_format=True,
        # Keep digits as digits ("4" not "four").
        numerals=True,
        # Banking-specific keyterms to boost recognition accuracy.
        keyterm=[
            "account",
            "EMI",
            "payment",
            "balance",
            "loan",
        ],
    )

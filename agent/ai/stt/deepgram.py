from livekit.plugins import deepgram


def create_stt():
    return deepgram.STT(
        model="nova-3",
        language="multi",
    )

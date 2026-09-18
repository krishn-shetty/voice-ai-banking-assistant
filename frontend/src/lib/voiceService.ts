import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TranscriptionSegment,
} from "livekit-client";

import type { LiveKitTokenResponse } from "../types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type TranscriptEvent = {
  text: string;
  sender: "user" | "assistant";
};

type TranscriptListener = (event: TranscriptEvent) => void;
type BooleanListener = (value: boolean) => void;

/* -------------------------------------------------------------------------- */
/* Voice service                                                              */
/* -------------------------------------------------------------------------- */

class VoiceServiceManager {
  private room: Room | null = null;

  private transcriptListeners = new Set<TranscriptListener>();
  private speakingListeners = new Set<BooleanListener>();
  private listeningListeners = new Set<BooleanListener>();

  private audioElements = new Map<string, HTMLAudioElement>();

  private started = false;
  private muted = false;
  private speakerEnabled = true;

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  getRoom(): Room | null {
    return this.room;
  }

  isConnected(): boolean {
    return this.room !== null && this.room.state === ConnectionState.Connected;
  }

  /* ------------------------------------------------------------------------ */
  /* Transcript                                                               */
  /* ------------------------------------------------------------------------ */

  onTranscript(listener: TranscriptListener): () => void {
    this.transcriptListeners.add(listener);

    return () => {
      this.transcriptListeners.delete(listener);
    };
  }

  private emitTranscript(text: string, sender: "user" | "assistant"): void {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const event: TranscriptEvent = {
      text: trimmed,
      sender,
    };

    for (const listener of this.transcriptListeners) {
      listener(event);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Speaking                                                                 */
  /* ------------------------------------------------------------------------ */

  onSpeaking(listener: BooleanListener): () => void {
    this.speakingListeners.add(listener);

    return () => {
      this.speakingListeners.delete(listener);
    };
  }

  private emitSpeaking(value: boolean): void {
    for (const listener of this.speakingListeners) {
      listener(value);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Listening                                                                */
  /* ------------------------------------------------------------------------ */

  onListening(listener: BooleanListener): () => void {
    this.listeningListeners.add(listener);

    return () => {
      this.listeningListeners.delete(listener);
    };
  }

  private emitListening(value: boolean): void {
    for (const listener of this.listeningListeners) {
      listener(value);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Start                                                                     */
  /* ------------------------------------------------------------------------ */

  /**
   * Connect to the authenticated LiveKit room.
   *
   * IMPORTANT:
   *
   * This method does NOT request a token.
   *
   * CallContext requests /livekit/token exactly once and passes the result
   * here.
   */
  async start(tokenData: LiveKitTokenResponse): Promise<void> {
    if (this.started || this.room) {
      console.warn("VoiceService: already connected.");
      return;
    }

    if (!tokenData.token) {
      throw new Error("LiveKit token is missing.");
    }

    if (!tokenData.url) {
      throw new Error("LiveKit URL is missing.");
    }

    if (!tokenData.call_id) {
      throw new Error("Authenticated call ID is missing.");
    }

    this.emitListening(false);
    this.emitSpeaking(false);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.room = room;

    this.registerRoomEvents(room);

    try {
      await room.connect(tokenData.url, tokenData.token, {
        autoSubscribe: true,
      });

      this.started = true;
      this.muted = false;

      console.info("LiveKit connected", {
        room: tokenData.room_name,
        callId: tokenData.call_id,
        participantIdentity: tokenData.participant_identity,
      });

      await this.enableMicrophone();

      /*
       * Browser audio playback can require a user gesture.
       * startAudio() is attempted here, but playback errors are not treated
       * as a connection failure.
       */
      await this.startAudioPlayback();

      this.emitListening(true);
    } catch (error) {
      console.error("LiveKit connection failed:", error);

      await this.cleanup();

      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to connect to the voice service.",
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Microphone                                                               */
  /* ------------------------------------------------------------------------ */

  private async enableMicrophone(): Promise<void> {
    if (!this.room) {
      throw new Error("LiveKit room is not initialized.");
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(true);

      this.muted = false;

      console.info("Microphone enabled.");
    } catch (error) {
      console.error("Microphone access failed:", error);

      throw new Error(
        "Microphone access is required to use the voice assistant.",
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Mute                                                                     */
  /* ------------------------------------------------------------------------ */

  mute(): void {
    if (!this.room) {
      return;
    }

    this.muted = true;

    void this.room.localParticipant
      .setMicrophoneEnabled(false)
      .catch((error) => {
        console.error("Unable to mute microphone:", error);
      });

    this.emitListening(false);
  }

  unmute(): void {
    if (!this.room) {
      return;
    }

    this.muted = false;

    void this.room.localParticipant
      .setMicrophoneEnabled(true)
      .then(() => {
        if (this.room?.state === ConnectionState.Connected) {
          this.emitListening(true);
        }
      })
      .catch((error) => {
        console.error("Unable to unmute microphone:", error);
      });
  }

  /* ------------------------------------------------------------------------ */
  /* Speaker                                                                  */
  /* ------------------------------------------------------------------------ */

  setSpeaker(enabled: boolean): void {
    this.speakerEnabled = enabled;

    for (const audioElement of this.audioElements.values()) {
      audioElement.muted = !enabled;
      audioElement.volume = enabled ? 1 : 0;
    }
  }

  async setSpeakerDevice(deviceId: string): Promise<void> {
    for (const audioElement of this.audioElements.values()) {
      // @ts-ignore - setSinkId is not in standard typescript DOM lib yet
      if (typeof audioElement.setSinkId === 'function') {
        try {
          // @ts-ignore
          await audioElement.setSinkId(deviceId);
        } catch (error) {
          console.warn("Unable to set speaker device:", error);
        }
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Room events                                                              */
  /* ------------------------------------------------------------------------ */

  private registerRoomEvents(room: Room): void {
    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        this.handleTrackSubscribed(track, publication, participant);
      },
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        this.handleTrackUnsubscribed(track, publication, participant);
      },
    );

    room.on(
      RoomEvent.ParticipantConnected,
      (participant: RemoteParticipant) => {
        console.info("Remote participant connected:", participant.identity);
      },
    );

    room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        console.info("Remote participant disconnected:", participant.identity);
      },
    );

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.info("LiveKit connection state:", state);

      switch (state) {
        case ConnectionState.Connecting:
          this.emitListening(false);
          break;

        case ConnectionState.Connected:
          if (!this.muted) {
            this.emitListening(true);
          }
          break;

        case ConnectionState.Disconnected:
          this.emitListening(false);
          this.emitSpeaking(false);
          break;

        default:
          break;
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const remoteSpeakerExists = speakers.some(
        (participant) =>
          participant.identity !== room.localParticipant.identity,
      );

      if (remoteSpeakerExists) {
        this.emitSpeaking(true);
        this.emitListening(false);
      } else {
        this.emitSpeaking(false);

        if (room.state === ConnectionState.Connected && !this.muted) {
          this.emitListening(true);
        }
      }
    });

    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (room.canPlaybackAudio) {
        void this.startAudioPlayback();
      }
    });

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      this.handleDataMessage(payload, participant);
    });

    // Native TranscriptionReceived is disabled in favor of DataChannel messages
    // room.on(
    //   RoomEvent.TranscriptionReceived,
    //   (
    //     segments: TranscriptionSegment[],
    //     participant?: RemoteParticipant,
    //   ) => {
    //     for (const segment of segments) {
    //       if (segment.isFinal) {
    //         const text = segment.text.trim();
    //         if (text) {
    //           const isLocal =
    //             participant?.identity === room.localParticipant.identity;
    //           this.emitTranscript(text, isLocal ? "user" : "assistant");
    //         }
    //       }
    //     }
    //   },
    // );

    room.on(RoomEvent.Disconnected, (reason) => {
      console.info("LiveKit disconnected:", reason);

      this.started = false;

      this.emitSpeaking(false);
      this.emitListening(false);

      this.removeAllAudioElements();
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Remote audio                                                             */
  /* ------------------------------------------------------------------------ */

  private handleTrackSubscribed(
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ): void {
    if (track.kind !== Track.Kind.Audio) {
      return;
    }

    const audioElement = track.attach();

    audioElement.autoplay = true;
    audioElement.controls = false;
    audioElement.muted = !this.speakerEnabled;
    audioElement.volume = this.speakerEnabled ? 1 : 0;

    audioElement.dataset.participant = participant.identity;

    document.body.appendChild(audioElement);

    const key = this.audioKey(participant.identity, track.sid);

    this.audioElements.set(key, audioElement);

    void audioElement.play().catch((error) => {
      /*
       * This is commonly caused by browser autoplay policy.
       * LiveKit playback can still be started after a user gesture.
       */
      console.warn("Browser blocked automatic audio playback:", error);
    });

    console.info("Remote audio track attached:", participant.identity);
  }

  private handleTrackUnsubscribed(
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ): void {
    if (track.kind !== Track.Kind.Audio) {
      return;
    }

    const key = this.audioKey(participant.identity, track.sid);

    const audioElement = this.audioElements.get(key);

    if (audioElement) {
      track.detach(audioElement);

      audioElement.pause();
      audioElement.remove();

      this.audioElements.delete(key);
    } else {
      track.detach();
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Data messages                                                            */
  /* ------------------------------------------------------------------------ */

  private handleDataMessage(
    payload: Uint8Array,
    participant?: RemoteParticipant,
  ): void {
    try {
      const text = new TextDecoder().decode(payload).trim();

      if (!text) {
        return;
      }

      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        console.debug("Ignoring non-JSON LiveKit data:", text);

        return;
      }

      if (!data || typeof data !== "object") {
        return;
      }

      const message = data as Record<string, unknown>;

      const type = typeof message.type === "string" ? message.type : "";

      if (
        type === "user_transcript" ||
        type === "assistant_transcript" ||
        type === "transcript"
      ) {
        this.handleTranscriptMessage(message, type);
        return;
      }
      
      // If the agent sends text via "lk-chat", echo it as assistant transcript?
      // No, agent already publishes assistant_transcript explicitly via conversation_item_added.
      
      console.debug("LiveKit data message:", {
        type,
        participant: participant?.identity,
      });
    } catch (error) {
      console.error("Failed to process LiveKit data:", error);
    }
  }

  private handleTranscriptMessage(
    message: Record<string, unknown>,
    type: string,
  ): void {
    const text = typeof message.text === "string" ? message.text.trim() : "";

    if (!text) {
      return;
    }

    let sender: "user" | "assistant";

    if (type === "user_transcript") {
      sender = "user";
    } else if (type === "assistant_transcript") {
      sender = "assistant";
    } else {
      sender = message.sender === "user" ? "user" : "assistant";
    }

    this.emitTranscript(text, sender);
  }

  /* ------------------------------------------------------------------------ */
  /* Chat messaging                                                           */
  /* ------------------------------------------------------------------------ */

  sendChatMessage(text: string): void {
    if (!this.room) return;

    try {
      const payload = JSON.stringify({
        id: crypto.randomUUID(),
        message: text,
        timestamp: Date.now(),
      });

      const encoder = new TextEncoder();
      this.room.localParticipant.publishData(encoder.encode(payload), {
        reliable: true,
        topic: "lk-chat"
      });
      
      // Echo the typed message locally so the UI updates instantly
      this.emitTranscript(text, "user");
    } catch (error) {
      console.error("Failed to send chat message", error);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Audio playback                                                           */
  /* ------------------------------------------------------------------------ */

  async startAudioPlayback(): Promise<void> {
    if (!this.room) {
      return;
    }

    try {
      await this.room.startAudio();

      console.info("LiveKit audio playback started.");
    } catch (error) {
      console.warn(
        "LiveKit audio playback requires browser permission/user gesture:",
        error,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Stop                                                                     */
  /* ------------------------------------------------------------------------ */

  async stop(): Promise<void> {
    if (!this.room) {
      this.started = false;

      this.emitSpeaking(false);
      this.emitListening(false);

      return;
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(false);
    } catch (error) {
      console.warn("Unable to disable microphone:", error);
    }

    await this.cleanup();

    this.emitSpeaking(false);
    this.emitListening(false);
  }

  /* ------------------------------------------------------------------------ */
  /* Cleanup                                                                  */
  /* ------------------------------------------------------------------------ */

  private async cleanup(): Promise<void> {
    if (this.room) {
      try {
        this.room.disconnect();
      } catch (error) {
        console.warn("LiveKit disconnect failed:", error);
      }
    }

    this.removeAllAudioElements();

    this.room = null;
    this.started = false;
    this.muted = false;
  }

  private removeAllAudioElements(): void {
    for (const audioElement of this.audioElements.values()) {
      try {
        audioElement.pause();
        audioElement.remove();
      } catch {
        // Ignore cleanup errors.
      }
    }

    this.audioElements.clear();
  }

  private audioKey(participantIdentity: string, trackSid?: string): string {
    return `${participantIdentity}:${trackSid ?? "audio"}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Singleton                                                                  */
/* -------------------------------------------------------------------------- */

export const VoiceService = new VoiceServiceManager();

export default VoiceService;

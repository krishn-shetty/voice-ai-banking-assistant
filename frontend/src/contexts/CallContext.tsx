import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  AssistantIdentity,
  AssistantProfile,
  Attachment,
  CallStatus,
  Message,
  Preferences,
  User,
} from "../types";

import { defaultPreferences } from "../data/preferences";
import { assistantProfiles } from "../data/assistants";
import { VoiceService } from "../lib/voiceService";
import * as api from "../lib/api";
import { timeLabel } from "../lib/utils";

const VOICE_STORAGE_KEY = "kautilya_selected_voice";

function getInitialAssistantIdentity(): AssistantIdentity {
  try {
    const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (stored === "kubera" || stored === "kanchana") return stored;
  } catch {
    // Ignore localStorage errors.
  }
  return "kubera";
}

interface CallContextValue {
  currentUser: User;

  isCallActive: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;

  isListening: boolean;
  isSpeaking: boolean;

  callDuration: number;
  callStatus: CallStatus;

  messages: Message[];

  currentCallId: string | null;
  isSummaryReady: boolean;

  assistant: AssistantProfile;
  assistantIdentity: AssistantIdentity;

  preferences: Preferences;

  toggleCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;

  sendText: (text: string, attachment?: Attachment) => void;

  updatePreferences: (patch: Partial<Preferences>) => void;

  setAssistantIdentity: (identity: AssistantIdentity) => void;

  /** Re-fetches the authenticated customer. Call this right after login. */
  refreshUser: () => Promise<void>;

  /** Ends any active call, clears the session, and routes to /login. */
  logout: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<CallStatus>("ready");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isSummaryReady, setIsSummaryReady] = useState(false);

  const [assistantIdentity, setAssistantIdentityState] =
    useState<AssistantIdentity>(getInitialAssistantIdentity);

  // Locked to the persona in use for the *current* call only; switching
  // voices in Settings mid-call must not change the live call's voice.
  const [callAssistantIdentity, setCallAssistantIdentity] =
    useState<AssistantIdentity | null>(null);

  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const assistant =
    assistantProfiles[
      isCallActive && callAssistantIdentity
        ? callAssistantIdentity
        : assistantIdentity
    ];

  /* ------------------------------------------------------------------------ */
  /* Load authenticated customer                                              */
  /* ------------------------------------------------------------------------ */

  const loadCurrentUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const user = await api.getAuthenticatedUser();
      if (!mountedRef.current) return;
      setCurrentUser(user);
    } catch (error) {
      console.error("Unable to load authenticated customer:", error);
      api.clearSession();
      if (!mountedRef.current) return;
      setCurrentUser(null);
      navigate("/login", { replace: true });
    } finally {
      if (mountedRef.current) setAuthLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;
    void loadCurrentUser();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCurrentUser]);

  /* ------------------------------------------------------------------------ */
  /* Persist selected assistant                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      window.localStorage.setItem(VOICE_STORAGE_KEY, assistantIdentity);
    } catch {
      // Ignore storage errors.
    }

    setPreferences((previous) => ({
      ...previous,
      voice: assistantProfiles[assistantIdentity].name,
    }));
  }, [assistantIdentity]);

  const setAssistantIdentity = useCallback((identity: AssistantIdentity) => {
    setAssistantIdentityState(identity);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Voice service event listeners                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const offSpeaking = VoiceService.onSpeaking((speaking) => {
      if (mountedRef.current) setIsSpeaking(speaking);
    });

    const offListening = VoiceService.onListening((listening) => {
      if (mountedRef.current) setIsListening(listening);
    });

    const offAgentState = VoiceService.onAgentState((state) => {
      if (!mountedRef.current) return;
      setCallStatus(state);
      if (state === "SPEAKING") {
        setIsSpeaking(true);
        setIsListening(false);
      } else if (state === "LISTENING") {
        setIsSpeaking(false);
        setIsListening(true);
      } else if (state === "THINKING") {
        setIsSpeaking(false);
        setIsListening(false);
      } else if (state === "ENDED") {
        setIsSpeaking(false);
        setIsListening(false);
        setIsCallActive(false);
      }
    });

    const offTranscript = VoiceService.onTranscript(({ text, sender }) => {
      if (!mountedRef.current) return;
      const trimmedText = text.trim();
      if (!trimmedText) return;

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender,
          senderName:
            sender === "assistant"
              ? assistant.name
              : (currentUser?.name ?? "You"),
          text: trimmedText,
          timestamp: timeLabel(),
        },
      ]);
    });

    return () => {
      offSpeaking();
      offListening();
      offAgentState();
      offTranscript();
    };
  }, [assistant.name, currentUser?.name]);

  /* ------------------------------------------------------------------------ */
  /* Call timer                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isCallActive) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setCallDuration((previous) => previous + 1);
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isCallActive]);

  /* ------------------------------------------------------------------------ */
  /* Start call                                                               */
  /* ------------------------------------------------------------------------ */

  const startCall = useCallback(async () => {
    if (isCallActive) return;

    if (!currentUser) {
      console.error("Cannot start call without an authenticated customer.");
      return;
    }

    const lockedIdentity = assistantIdentity;

    setCallStatus("CONNECTING");
    setIsSummaryReady(false);
    setCallDuration(0);
    setMessages([]);
    setCurrentCallId(null);
    setCallAssistantIdentity(lockedIdentity);
    setIsMuted(false);
    setIsListening(false);
    setIsSpeaking(false);

    try {
      // /livekit/token both authenticates and creates the Call record, and
      // now also tells the agent which persona to start with.
      const tokenData = await api.getLiveKitToken(
        currentUser.name,
        lockedIdentity,
      );

      setCurrentCallId(tokenData.call_id);
      setIsCallActive(true);

      await VoiceService.start(tokenData);

      if (!mountedRef.current) return;
      if (VoiceService.getCurrentAgentState() === "ready" || VoiceService.getCurrentAgentState() === "CONNECTING") {
        setCallStatus("LISTENING");
      }
    } catch (error) {
      console.error("Unable to start voice call:", error);

      await VoiceService.stop();
      if (!mountedRef.current) return;

      setIsCallActive(false);
      setIsListening(false);
      setIsSpeaking(false);
      setCallStatus("ready");
      setCurrentCallId(null);
      setCallAssistantIdentity(null);
      setMessages([]);
      setIsSummaryReady(false);
    }
  }, [assistantIdentity, currentUser, isCallActive]);

  /* ------------------------------------------------------------------------ */
  /* Stop call                                                                */
  /* ------------------------------------------------------------------------ */

  const stopCall = useCallback(async () => {
    if (!isCallActive) return;

    const callId = currentCallId;

    await VoiceService.stop();
    if (!mountedRef.current) return;

    setIsCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCallStatus("ENDED");

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (!callId) {
      console.error("Call ended without a backend call ID.");
      setIsSummaryReady(false);
      setCallAssistantIdentity(null);
      return;
    }

    // Wait for the agent to persist final messages, generate summary, and end call.
    let attempts = 0;
    const pollSummary = async () => {
      if (!mountedRef.current) return;
      if (attempts > 10) {
        setIsSummaryReady(false);
        setCallAssistantIdentity(null);
        return;
      }
      try {
        const call = await api.getCall(callId);
        if (call.summary.status === "completed") {
          setIsSummaryReady(true);
          setCallAssistantIdentity(null);
        } else {
          attempts++;
          setTimeout(pollSummary, 2000);
        }
      } catch (error) {
        attempts++;
        setTimeout(pollSummary, 2000);
      }
    };
    
    setTimeout(pollSummary, 1500);

  }, [currentCallId, isCallActive]);

  /* ------------------------------------------------------------------------ */
  /* Auth: logout                                                             */
  /* ------------------------------------------------------------------------ */

  const logout = useCallback(async () => {
    if (isCallActive) {
      await stopCall();
    }
    try {
      await api.logout();
    } finally {
      if (mountedRef.current) setCurrentUser(null);
      navigate("/login", { replace: true });
    }
  }, [isCallActive, stopCall, navigate]);

  /* ------------------------------------------------------------------------ */
  /* Toggle call / mute / speaker                                             */
  /* ------------------------------------------------------------------------ */

  const toggleCall = useCallback(() => {
    if (isCallActive) {
      void stopCall();
      return;
    }
    void startCall();
  }, [isCallActive, startCall, stopCall]);

  const toggleMute = useCallback(() => {
    if (!isCallActive) return;

    setIsMuted((previous) => {
      const next = !previous;
      if (next) VoiceService.mute();
      else VoiceService.unmute();
      return next;
    });
  }, [isCallActive]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((previous) => {
      const next = !previous;
      VoiceService.setSpeaker(next);
      return next;
    });
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Text chat (not yet connected to the real agent on the backend)           */
  /* ------------------------------------------------------------------------ */

  const sendText = useCallback(
    async (text: string, attachment?: Attachment) => {
      if (!isCallActive) return;

      const trimmed = text.trim();
      if (!trimmed && !attachment) return;

      try {
        VoiceService.sendChatMessage(trimmed);
      } catch (error) {
        console.warn("Text message was not sent:", error);
      }
    },
    [isCallActive],
  );

  /* ------------------------------------------------------------------------ */
  /* Preferences                                                              */
  /* ------------------------------------------------------------------------ */

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((previous) => ({ ...previous, ...patch }));
    void api.updatePreferences(patch).catch((error) => {
      console.warn("Unable to persist preferences:", error);
    });
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Cleanup on unmount                                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      void VoiceService.stop();
    };
  }, []);

  const resolvedUser: User = useMemo(
    () =>
      currentUser ?? {
        id: "",
        name: "Customer",
        initials: "C",
        verified: false,
      },
    [currentUser],
  );

  const value = useMemo<CallContextValue>(
    () => ({
      currentUser: resolvedUser,
      isCallActive,
      isMuted,
      isSpeakerOn,
      isListening,
      isSpeaking,
      callDuration,
      callStatus,
      messages,
      currentCallId,
      isSummaryReady,
      assistant,
      assistantIdentity,
      preferences,
      toggleCall,
      toggleMute,
      toggleSpeaker,
      sendText,
      updatePreferences,
      setAssistantIdentity,
      refreshUser: loadCurrentUser,
      logout,
    }),
    [
      resolvedUser,
      isCallActive,
      isMuted,
      isSpeakerOn,
      isListening,
      isSpeaking,
      callDuration,
      callStatus,
      messages,
      currentCallId,
      isSummaryReady,
      assistant,
      assistantIdentity,
      preferences,
      toggleCall,
      toggleMute,
      toggleSpeaker,
      sendText,
      updatePreferences,
      setAssistantIdentity,
      loadCurrentUser,
      logout,
    ],
  );

  // authLoading is intentionally not exposed on the context yet — the
  // ProtectedRoute guard uses api.isAuthenticated() (a cheap sync check)
  // and this effect's own navigate("/login") call handles expired sessions.
  void authLoading;

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}

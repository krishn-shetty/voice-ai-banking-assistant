import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useCall } from "../contexts/CallContext";
import { CallStatusPill } from "../components/call/CallStatusPill";
import { VoiceArea } from "../components/call/VoiceArea";
import { MessageBubble } from "../components/call/MessageBubble";
import { MessageInput } from "../components/call/MessageInput";
import { CallControls } from "../components/call/CallControls";
import { SummaryPanel } from "../components/call/SummaryPanel";
import { HighlightsCard } from "../components/call/HighlightsCard";
import { cn } from "../lib/utils";
import { getCall } from "../lib/api";
import type { CallSummary } from "../types";

export function CallPage() {
  const {
    messages,
    callStatus,
    callDuration,
    isSummaryReady,
    currentCallId,
    preferences,
    assistant,
  } = useCall();

  // Single scroll region for the whole transcript — this is the ONLY
  // element that scrolls. No split lanes, no separate refs.
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const hasPositionedInitialTranscript = useRef(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Real backend summary state (fetched after call ends).
  const [backendSummary, setBackendSummary] = useState<CallSummary | null>(
    null,
  );
  const [summaryLoading, setSummaryLoading] = useState(false);

  const callCompleted =
    callStatus === "ended" && isSummaryReady && backendSummary !== null;

  const conversationHighlights = useMemo(
    () => [
      ...messages.map((message) => ({
        id: `highlight_${message.id}`,
        time: message.timestamp,
        label: `${message.senderName}: ${message.text}`,
      })),
      ...(callCompleted
        ? [
            {
              id: "highlight_call_ended",
              time: "",
              label: "User ended the conversation",
            },
          ]
        : []),
    ],
    [messages, callCompleted],
  );

  useEffect(() => {
    if (!hasPositionedInitialTranscript.current) {
      hasPositionedInitialTranscript.current = true;
      return;
    }
    const region = scrollRegionRef.current;
    if (region) {
      region.scrollTo({ top: region.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    if (callCompleted) setMobileSummaryOpen(true);
  }, [callCompleted]);

  // Fetch real summary from backend when call ends.
  useEffect(() => {
    if (!isSummaryReady || !currentCallId) return;

    let cancelled = false;
    setSummaryLoading(true);

    getCall(currentCallId)
      .then((record) => {
        if (!cancelled) setBackendSummary(record.summary);
      })
      .catch((error) => {
        console.error("Unable to load call summary:", error);
        if (!cancelled) setBackendSummary(null);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSummaryReady, currentCallId]);

  // Reset summary state when a new call starts.
  useEffect(() => {
    if (callStatus === "connecting") {
      setBackendSummary(null);
      setSummaryLoading(false);
    }
  }, [callStatus]);

  return (
    <div className="call-page">
      {/* Main call area */}
      <section
        aria-label={`Live call with ${assistant.name}`}
        className="call-console console-surface"
      >
        {/* Call Console Header - Static top bar, never scrolls */}
        <div className="call-console-header">
          {/* Mobile/Tablet Header (<1200px): Left Avatar identity, Right Call status */}
          <div className="console-header-mobile">
            <div className="mobile-agent-identity">
              <VoiceArea compact hideStatusPill />
            </div>
            <div className="mobile-call-status">
              <CallStatusPill
                compact
                align="end"
                status={callStatus}
                duration={callDuration}
              />
            </div>
          </div>

          {/* Desktop Header (>=1200px): Centered Status Pill */}
          <div className="console-header-desktop">
            <CallStatusPill status={callStatus} duration={callDuration} />
          </div>
        </div>

        <div className="console-content">
          {/* Fixed, centered avatar layer — absolutely positioned so it
              never takes layout space and never scrolls with messages.
              Only visible on wide screens (>=1200px); on mobile the
              compact avatar in the header already covers this. */}
          <div className="call-console-voice" aria-hidden="true">
            <VoiceArea />
          </div>

          {preferences.showTranscript ? (
            <div
              ref={scrollRegionRef}
              className="console-transcript kubera-scroll"
              aria-label="Call transcript"
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} narrow />
              ))}
            </div>
          ) : (
            <div className="console-transcript-placeholder">
              <p className="text-xs text-ink-muted">
                Transcript is hidden. You can turn it back on in Settings.
              </p>
            </div>
          )}
        </div>

        <div className="call-console-actions">
          <div className="call-composer">
            <MessageInput />
          </div>

          <div className="call-controls-wrap">
            <CallControls />
          </div>
        </div>
      </section>

      {/* Live highlights remain available throughout the call. */}
      <aside
        aria-label="Conversation highlights and call summary"
        className="desktop-call-sidebar"
      >
        <div className="space-y-4">
          <HighlightsCard highlights={conversationHighlights} scrollable />
          <AnimatePresence>
            {callCompleted && backendSummary && currentCallId && (
              <motion.div
                key="completed-summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <SummaryPanel
                  summary={backendSummary}
                  callId={currentCallId}
                  showHighlights={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <div className="mobile-call-summary">
        <HighlightsCard highlights={conversationHighlights} scrollable />
        <AnimatePresence>
          {callCompleted && backendSummary && currentCallId && (
            <motion.section
              key="mobile-completed-summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              aria-label="Completed call summary"
            >
              <button
                type="button"
                onClick={() => setMobileSummaryOpen((open) => !open)}
                aria-expanded={mobileSummaryOpen}
                aria-controls="mobile-completed-summary-content"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-ink shadow-card"
              >
                Call Summary
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-ink-muted transition-transform",
                    mobileSummaryOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {mobileSummaryOpen && (
                  <motion.div
                    id="mobile-completed-summary-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <SummaryPanel
                        summary={backendSummary}
                        callId={currentCallId}
                        showHighlights={false}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

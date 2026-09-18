import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { CallRecord } from "../types";
import { getCall } from "../lib/api";
import { useCall } from "../contexts/CallContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { MessageBubble } from "../components/call/MessageBubble";
import { CallSummaryCard } from "../components/call/CallSummaryCard";
import { HighlightsCard } from "../components/call/HighlightsCard";
import { DownloadSummaryButton } from "../components/call/DownloadSummaryButton";

export function CallDetailPage() {
  const { callId } = useParams<{ callId: string }>();
  const { currentUser } = useCall();
  const [call, setCall] = useState<CallRecord | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!callId) return;

    getCall(callId)
      .then((data) => {
        if (cancelled) return;
        // The backend only knows "Customer"/"Assistant" — swap in the real
        // logged-in customer's name for their own lines.
        const messages = data.messages.map((message) =>
          message.sender === "user"
            ? { ...message, senderName: currentUser.name }
            : message,
        );
        setCall({ ...data, messages });
      })
      .catch(() => {
        if (!cancelled) setCall(null);
      });

    return () => {
      cancelled = true;
    };
  }, [callId, currentUser.name]);

  /* Loading state */
  if (call === undefined) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <div className="flex items-center justify-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading call details…
        </div>
      </section>
    );
  }

  /* Error / not found state */
  if (call === null) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <Link
          to="/history"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to History
        </Link>
        <p className="mt-4 rounded-2xl border border-line bg-white p-5 text-sm text-danger">
          We couldn&apos;t load this call. It may not exist or you may not have
          permission to view it.
        </p>
      </section>
    );
  }

  /* Render call detail */
  return (
    <section
      aria-label="Call detail"
      className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8"
    >
      {/* Back link */}
      <Link
        to="/history"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to History
      </Link>

      {/* Call header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {call.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {call.dateGroup} · {call.time}
          </span>
          {call.duration !== "—" && <span>{call.duration}</span>}
          <Badge
            tone={
              call.result === "Resolved"
                ? "success"
                : call.result === "Escalated"
                  ? "danger"
                  : "neutral"
            }
          >
            {call.result}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {/* Summary */}
        <CallSummaryCard summary={call.summary} />

        {/* Highlights */}
        {call.summary.highlights.length > 0 && (
          <HighlightsCard highlights={call.summary.highlights} />
        )}

        {/* Transcript */}
        {call.messages.length > 0 && (
          <Card>
            <CardHeader title="Transcript" />
            <div className="max-h-96 overflow-y-auto px-5 py-4">
              {call.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          </Card>
        )}

        {call.messages.length === 0 && (
          <Card>
            <CardHeader title="Transcript" />
            <p className="px-5 py-6 text-center text-sm text-ink-muted">
              No transcript recorded for this call.
            </p>
          </Card>
        )}

        {/* Download */}
        <DownloadSummaryButton callId={call.id} />
      </div>
    </section>
  );
}

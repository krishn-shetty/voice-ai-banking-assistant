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

    getCall(callId).then((data) => {
      if (cancelled) return;
      // The backend only knows "Customer"/"Assistant" — swap in the real
      // logged-in customer's name for their own lines.
      const messages = data.messages.map((message) =>
        message.sender === "user"
          ? { ...message, senderName: currentUser.name }
          : message,
      );
      setCall({ ...data, messages });
    });

    return () => {
      cancelled = true;
    };
  }, [callId, currentUser.name]);

  // ...rest of the file is unchanged...
}

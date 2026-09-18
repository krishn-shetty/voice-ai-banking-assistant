import React from "react";
import { motion } from "framer-motion";
import {
  AudioLines,
  CheckCheck,
  CircleUserRound,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { Message } from "../../types";
import { cn } from "../../lib/utils";
import { useCall } from "../../contexts/CallContext";

const attachmentIcon = {
  image: ImageIcon,
  pdf: FileText,
  document: Paperclip,
};

export function MessageBubble({
  message,
  narrow = false,
}: {
  message: Message;
  narrow?: boolean;
}) {
  const { assistant } = useCall();
  const isAssistant = message.sender === "assistant";
  const AttachmentIcon = message.attachment
    ? attachmentIcon[message.attachment.kind]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "console-message-row flex w-full",
        isAssistant
          ? "console-message-row--assistant justify-start"
          : "console-message-row--user justify-end",
      )}
    >
      <div
        className={cn(
          "w-full min-w-0",
          // Capped tighter, and as a % of the row so it scales with
          // container width and never reaches the centered avatar
          // overlay, regardless of screen size.
          narrow
            ? "max-w-full min-[1200px]:max-w-[min(285px,42%)]"
            : "max-w-full sm:max-w-[440px]",
        )}
      >
        <p
          className={cn(
            "mb-1.5 text-xs font-medium text-ink-muted",
            isAssistant ? "text-left" : "text-right",
          )}
        >
          {isAssistant
            ? `${assistant.name} (AI Assistant)`
            : `${message.senderName} (You)`}
        </p>

        <div
          className={cn(
            "console-message-content flex min-w-0 max-w-full items-start gap-2",
            isAssistant ? "" : "justify-end",
          )}
        >
          {isAssistant && (
            <span
              aria-hidden="true"
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
            >
              <AudioLines className="h-4 w-4" />
            </span>
          )}
          <div
            className={cn(
              "console-message-card min-w-0 rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_2px_12px_rgba(15,23,42,0.025)]",
              isAssistant
                ? "console-message-card--assistant text-[#8B1E3F]"
                : "console-message-card--user text-[#A06A38]",
            )}
          >
            {message.attachment && AttachmentIcon && (
              <span className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-muted">
                <AttachmentIcon
                  className="h-3.5 w-3.5 text-brand"
                  aria-hidden="true"
                />
                {message.attachment.name}
              </span>
            )}
            {message.text && <p>{message.text}</p>}
          </div>
          {!isAssistant && (
            <span
              aria-hidden="true"
              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-slate-400"
            >
              <CircleUserRound className="h-4 w-4" />
            </span>
          )}
        </div>

        <div
          className={cn(
            "mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted",
            isAssistant ? "justify-start pl-10" : "justify-end pr-10",
          )}
        >
          <span>{message.timestamp}</span>
          {!isAssistant && (
            <CheckCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Plus,
  SendHorizonal,
} from "lucide-react";
import { useCall } from "../../contexts/CallContext";
import { uploadAttachment } from "../../lib/api";
import { Attachment } from "../../types";
import { MESSAGE_MAX_LENGTH, validateMessageText } from "../../lib/utils";

const attachOptions = [
  { kind: "image", label: "Image", icon: ImageIcon, accept: "image/*" },
  { kind: "pdf", label: "PDF", icon: FileText, accept: "application/pdf" },
  {
    kind: "document",
    label: "Document",
    icon: Paperclip,
    accept: ".doc,.docx,.txt,.csv",
  },
] as const;

export function MessageInput() {
  const { sendText, assistant, isCallActive } = useCall();
  const [value, setValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const disabled = !isCallActive || uploading;

  useEffect(() => {
    if (!isCallActive) {
      setMenuOpen(false);
      setError(null);
    }
  }, [isCallActive]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const pickFile = (accept: string) => {
    if (disabled || !fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
    setMenuOpen(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const attachment = await uploadAttachment(file);
    setPending(attachment);
    setUploading(false);
    e.target.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    const trimmed = value.trim();
    if (!trimmed && !pending) {
      setError("Type a message or attach a file before sending.");
      return;
    }
    if (trimmed) {
      const validation = validateMessageText(value);
      if (!validation.valid) {
        setError(validation.error ?? "That message can't be sent.");
        return;
      }
    }

    setError(null);
    sendText(value, pending ?? undefined);
    setValue("");
    setPending(null);
  };

  return (
    <form onSubmit={submit} className="w-full">
      {(pending || uploading) && (
        <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
          <Paperclip className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          {uploading ? "Uploading attachment…" : pending?.name}
          {pending && (
            <button
              type="button"
              onClick={() => setPending(null)}
              className="font-medium text-brand hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div
        ref={wrapRef}
        className="relative flex items-center gap-2 rounded-2xl border border-line bg-white/90 px-2.5 py-2 shadow-soft backdrop-blur-sm focus-within:border-brand/40 aria-disabled:opacity-60"
        aria-disabled={disabled}
      >
        <button
          type="button"
          aria-label="Attach a file"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted"
        >
          <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        <AnimatePresence>
          {menuOpen && !disabled && (
            <motion.div
              role="menu"
              aria-label="Attach file"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className="absolute bottom-12 left-0 w-44 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-soft"
            >
              <p className="px-3.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Attach file
              </p>
              {attachOptions.map(({ kind, label, icon: Icon, accept }) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  onClick={() => pickFile(accept)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-brand-soft"
                >
                  <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <label htmlFor="kubera-message" className="sr-only">
          {isCallActive
            ? `Type a message to ${assistant.name}`
            : "Chat is available during an active call"}
        </label>
        <input
          id="kubera-message"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={MESSAGE_MAX_LENGTH}
          aria-invalid={!!error}
          aria-describedby={error ? "kubera-message-error" : undefined}
          placeholder={
            isCallActive ? "Type a message…" : "Start a call to chat"
          }
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />

        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          onChange={onFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={disabled || (!value.trim() && !pending)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-slate-200 disabled:text-slate-400"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <p
          id="kubera-message-error"
          role="alert"
          className="mt-1.5 px-1 text-xs font-medium text-danger"
        >
          {error}
        </p>
      ) : !isCallActive ? (
        <p className="mt-1.5 px-1 text-xs text-ink-muted">
          Chat is available once a call is active.
        </p>
      ) : null}
    </form>
  );
}

import { twMerge } from "tailwind-merge";

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function timeLabel(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Masks all but the last 4 digits, e.g. "5312009981001" -> "•••• •••• 1001" */
export function maskAccountNumber(full: string): string {
  const digitsOnly = full.replace(/\s+/g, "");
  if (digitsOnly.length <= 4) return digitsOnly;
  const last4 = digitsOnly.slice(-4);
  return `•••• •••• ${last4}`;
}

export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 500;

// Letters, numbers, spaces, and a conservative set of basic punctuation.
// No emojis, no markup/control characters — deliberately narrow for a
// banking chat surface.
const ALLOWED_MESSAGE_PATTERN = /^[A-Za-z0-9\s.,!?'"()\-:;]*$/;

export interface MessageValidationResult {
  valid: boolean;
  error?: string;
}

/** Shared client + "server" validation for chat message text. */
export function validateMessageText(raw: string): MessageValidationResult {
  const text = raw ?? "";
  const trimmed = text.trim();

  if (trimmed.length < MESSAGE_MIN_LENGTH) {
    return { valid: false, error: "Message cannot be empty." };
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters.`,
    };
  }
  if (!ALLOWED_MESSAGE_PATTERN.test(text)) {
    return {
      valid: false,
      error:
        "Only letters, numbers, spaces, and basic punctuation ( , . ! ? ' \" ( ) - : ; ) are allowed.",
    };
  }
  return { valid: true };
}

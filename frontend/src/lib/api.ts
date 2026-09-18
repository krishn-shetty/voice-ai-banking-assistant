import type {
  Attachment,
  CallIntent,
  CallRecord,
  Highlight,
  LiveKitTokenResponse,
  Message,
  MessageSender,
  User,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const SESSION_STORAGE_KEY = "kubera_session_id";

export interface LoginResponse {
  authenticated: boolean;
  session_id: string;
  customer_id: string;
  customer_name: string;
  masked_account: string | null;
  expires_at: string;
}

export interface AuthenticatedUserResponse {
  authenticated: boolean;
  customer_id: string;
  customer_name: string;
  email: string;
  phone_number: string;
  expires_at: string;
}

export interface BackendCall {
  id: string;
  customer_id: string;
  transcript: string | null;
  summary_json: Record<string, unknown> | null;
  outcome: string | null;
  escalated: boolean;
  created_at: string;
}

export interface BackendCallListResponse {
  calls: BackendCall[];
}

/* -------------------------------------------------------------------------- */
/* SESSION STORAGE                                                            */
/* -------------------------------------------------------------------------- */

function getSessionId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

function clearSessionId(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Publicly usable so the rest of the app can drop a dead/expired session. */
export function clearSession(): void {
  clearSessionId();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  let data: unknown;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
    ) {
      message = (data as { detail: string }).detail;
    }

    throw new Error(message);
  }

  return data as T;
}

function authHeaders(): HeadersInit {
  const sessionId = getSessionId();

  if (!sessionId) {
    throw new Error("Authentication required.");
  }

  return {
    Authorization: `Bearer ${sessionId}`,
    "Content-Type": "application/json",
  };
}

/* -------------------------------------------------------------------------- */
/* AUTH                                                                       */
/* -------------------------------------------------------------------------- */

export async function login(
  email: string,
  phoneNumber: string,
  dateOfBirth: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
    }),
  });

  const data = await parseResponse<LoginResponse>(response);

  if (!data.authenticated || !data.session_id) {
    throw new Error("Authentication failed.");
  }

  setSessionId(data.session_id);

  return data;
}

export async function logout(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) return;

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
        "Content-Type": "application/json",
      },
    });
  } finally {
    clearSessionId();
  }
}

export async function getAuthenticatedUser(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await parseResponse<AuthenticatedUserResponse>(response);

  return {
    id: data.customer_id,
    name: data.customer_name,
    initials: getInitials(data.customer_name),
    verified: true,
    email: data.email,
    mobile: data.phone_number,
  };
}

export function isAuthenticated(): boolean {
  return Boolean(getSessionId());
}

export function getSessionToken(): string | null {
  return getSessionId();
}

/* -------------------------------------------------------------------------- */
/* LIVEKIT                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `assistantIdentity` is the frontend's chosen persona ("kubera" | "kanchana").
 * It is forwarded to the backend so the voice agent boots with the correct
 * voice instead of always falling back to its own default.
 */
export async function getLiveKitToken(
  participantName: string,
  assistantIdentity: string,
): Promise<LiveKitTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/livekit/token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      participant_name: participantName,
      assistant_identity: assistantIdentity,
    }),
  });

  return parseResponse<LiveKitTokenResponse>(response);
}

/* -------------------------------------------------------------------------- */
/* CALLS                                                                      */
/* -------------------------------------------------------------------------- */

export async function getCallHistory(): Promise<CallRecord[]> {
  const response = await fetch(`${API_BASE_URL}/calls/customer/history`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await parseResponse<BackendCallListResponse>(response);
  return data.calls.map(mapBackendCallToFrontend);
}

export async function getCall(callId: string): Promise<CallRecord> {
  const response = await fetch(
    `${API_BASE_URL}/calls/${encodeURIComponent(callId)}`,
    { method: "GET", headers: authHeaders() },
  );

  const data = await parseResponse<BackendCall>(response);
  return mapBackendCallToFrontend(data);
}

export async function endCall(callId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/calls/${encodeURIComponent(callId)}/end`,
    { method: "POST", headers: authHeaders() },
  );

  await parseResponse(response);
}

export async function saveCallSummary(
  callId: string,
  summary: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/calls/${encodeURIComponent(callId)}/summary`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(summary),
    },
  );

  await parseResponse(response);
}

/* -------------------------------------------------------------------------- */
/* CHAT / ATTACHMENTS                                                         */
/*                                                                             */
/* Text chat is not wired to the voice agent yet on the backend. We still     */
/* let the compose UI work end-to-end (pick a file, see it staged, hit send), */
/* but sendMessage surfaces a clear error instead of pretending success.      */
/* -------------------------------------------------------------------------- */

function getAttachmentKind(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "document";
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  // No backend endpoint exists yet to persist chat attachments, so we keep
  // a lightweight client-side reference. sendMessage() below is what will
  // actually reject the send with a clear message.
  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind: getAttachmentKind(file),
  };
}

export async function sendMessage(_payload: {
  callId: string | null;
  text: string;
  attachment?: Attachment;
  assistantName: string;
}): Promise<never> {
  throw new Error(
    "Text messaging is not implemented in the current voice flow.",
  );
}

/* -------------------------------------------------------------------------- */
/* PREFERENCES (client-side persistence stub; no backend endpoint yet)        */
/* -------------------------------------------------------------------------- */

export async function updatePreferences(
  _patch: Record<string, unknown>,
): Promise<void> {
  // Intentionally a no-op network call: there is no /preferences endpoint
  // on the backend yet. CallContext already persists preferences in memory
  // and the selected voice in localStorage.
}

/* -------------------------------------------------------------------------- */
/* DOWNLOAD SUMMARY                                                           */
/* -------------------------------------------------------------------------- */

export async function downloadCallSummary(
  callId: string,
  assistantName: string,
): Promise<void> {
  const call = await getCall(callId);

  const content = [
    `Call Summary`,
    ``,
    `Assistant: ${assistantName}`,
    `Title: ${call.title}`,
    `Date: ${call.dateGroup}`,
    `Time: ${call.time}`,
    `Result: ${call.result}`,
    ``,
    `Intent: ${call.summary.intent}`,
    `Identity verified: ${call.summary.identityVerified ? "Yes" : "No"}`,
    `Escalated: ${call.summary.escalated ? "Yes" : "No"}`,
    ``,
    `Key details: ${call.summary.keyDetails}`,
    `Outcome: ${call.summary.outcome}`,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `call-summary-${callId}.txt`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const KNOWN_INTENTS: CallIntent[] = [
  "balance",
  "loan",
  "emi",
  "payment",
  "other",
];

function toKnownIntent(value: string): CallIntent {
  return (KNOWN_INTENTS as string[]).includes(value)
    ? (value as CallIntent)
    : "other";
}

function getCallTitle(intent: string): string {
  switch (intent) {
    case "balance":
      return "Balance enquiry";
    case "loan":
      return "Loan enquiry";
    case "emi":
      return "EMI enquiry";
    case "payment":
      return "Payment assistance";
    default:
      return "Banking conversation";
  }
}

function formatDateGroup(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The backend agent stores a raw "Speaker: text" transcript (see
 * agent/agent.py `build_transcript`). Turn it into structured Message[]
 * so CallDetail can render it as chat bubbles instead of nothing.
 */
function parseTranscriptToMessages(
  transcript: string,
  createdAt: string,
): Message[] {
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  const timestamp = formatTime(createdAt);

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separatorIndex = line.indexOf(":");
      const speaker =
        separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : "";
      const text =
        separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;

      const sender: MessageSender =
        speaker.toLowerCase() === "customer" ? "user" : "assistant";

      return {
        id: `${callIdSafe(createdAt)}_${sender}_${index}`,
        sender,
        senderName: sender === "user" ? "Customer" : "Assistant",
        text,
        timestamp,
      };
    });
}

function callIdSafe(seed: string): string {
  return seed.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * The Gemini summary carries free-form intent/outcome/key_details. There is
 * no per-turn highlight data from the backend, so we synthesize a short,
 * still-accurate highlight list from the structured summary instead of
 * leaving HighlightsCard permanently empty.
 */
function buildHighlightsFromSummary(
  summary: Record<string, unknown>,
  createdAt: string,
  escalated: boolean,
): Highlight[] {
  const time = formatTime(createdAt);
  const highlights: Highlight[] = [];

  const intent = typeof summary.intent === "string" ? summary.intent : "";
  if (intent) {
    highlights.push({ id: "summary_intent", time, label: `Intent: ${intent}` });
  }

  const keyDetails = Array.isArray(summary.key_details)
    ? summary.key_details.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  keyDetails.forEach((detail, index) => {
    highlights.push({ id: `summary_detail_${index}`, time, label: detail });
  });

  const outcome = typeof summary.outcome === "string" ? summary.outcome : "";
  if (outcome) {
    highlights.push({
      id: "summary_outcome",
      time,
      label: `Outcome: ${outcome}`,
    });
  }

  if (escalated) {
    highlights.push({
      id: "summary_escalated",
      time,
      label: "Call was escalated to a human representative",
    });
  }

  return highlights;
}

function mapBackendCallToFrontend(call: BackendCall): CallRecord {
  const summary =
    call.summary_json && typeof call.summary_json === "object"
      ? call.summary_json
      : {};

  const intent = typeof summary.intent === "string" ? summary.intent : "other";

  const keyDetails = Array.isArray(summary.key_details)
    ? summary.key_details.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const result: CallRecord["result"] = call.escalated
    ? "Escalated"
    : call.outcome
      ? "Resolved"
      : "Dropped";

  return {
    id: call.id,
    title: getCallTitle(intent),
    intent: toKnownIntent(intent),
    dateGroup: formatDateGroup(call.created_at),
    time: formatTime(call.created_at),
    duration: "—",
    result,
    summary: {
      status: call.outcome ? "completed" : "incomplete",
      identityVerified: true,
      intent,
      keyDetails: keyDetails.length
        ? keyDetails.join(" • ")
        : "No details recorded.",
      outcome:
        typeof summary.outcome === "string"
          ? summary.outcome
          : call.outcome || "Call in progress.",
      escalated: call.escalated,
      highlights: buildHighlightsFromSummary(
        summary,
        call.created_at,
        call.escalated,
      ),
    },
    messages: parseTranscriptToMessages(call.transcript || "", call.created_at),
  };
}

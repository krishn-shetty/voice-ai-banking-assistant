export type CallStatus =
  | "ready"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "ended";

export type MessageSender = "assistant" | "user";

export type AssistantIdentity = "kubera" | "kanchana";

export interface AssistantProfile {
  id: AssistantIdentity;
  name: "Kubera" | "Kanchana";
  avatarUrl: string;
  gender: "Male" | "Female";
}

export interface Attachment {
  id: string;
  name: string;
  kind: "image" | "pdf" | "document";
}

export interface Message {
  id: string;
  sender: MessageSender;
  senderName: string;
  text: string;
  timestamp: string;
  attachment?: Attachment;
}

export type CallIntent = "balance" | "loan" | "emi" | "payment" | "other";

export interface CallSummary {
  status: "completed" | "incomplete";
  identityVerified: boolean;
  primaryIntent: string;
  additionalIntents: string[];
  keyDetails: string[];
  actionsPerformed: string[];
  paymentPromise: string | null;
  outcome: string;
  escalated: boolean;
  highlights: Highlight[];
}

export interface Highlight {
  id: string;
  time: string;
  label: string;
}

export interface CallRecord {
  id: string;
  title: string;
  intent: CallIntent;
  dateGroup: string;
  time: string;
  duration: string;
  result: "Resolved" | "Escalated" | "Dropped";
  summary: CallSummary;
  messages: Message[];
}

export interface User {
  id: string;
  name: string;
  initials: string;
  verified: boolean;
  accountNumber?: string;
  accountMasked?: string;
  balance?: string;
  email?: string;
  mobile?: string;
}

export interface Preferences {
  voice: string;
  microphone: string;
  speaker: string;
  showTranscript: boolean;
  autoStartListening: boolean;
  speakerEnabled: boolean;
  theme: "system" | "light" | "dark";
}

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room_name: string;
  participant_identity: string;
  call_id: string;
}

import { CallRecord, CallSummary, Message, User } from "../types";
import { mockConversation } from "./mockConversation";

export const currentUser: User = {
  id: "u_1",
  name: "Rahul Mehta",
  initials: "RM",
  verified: true,
  accountNumber: "5312009981001",
  email: "rahul.mehta@example.com",
  mobile: "+91 98765 43210",
};

export const balanceSummary: CallSummary = {
  status: "completed",
  identityVerified: true,
  intent: "Balance inquiry",
  keyDetails: "Available balance: ₹84,320",
  outcome: "Resolved",
  escalated: false,
  highlights: [
    { id: "h1", time: "10:24 AM", label: "User asked for current balance" },
    {
      id: "h2",
      time: "10:24 AM",
      label: "Kubera provided balance information",
    },
    {
      id: "h3",
      time: "10:24 AM",
      label: "User confirmed no further help needed",
    },
    { id: "h4", time: "10:25 AM", label: "Call ended successfully" },
  ],
};

const loanMessages: Message[] = [
  {
    id: "lm1",
    sender: "assistant",
    senderName: "Kubera",
    text: "Hi Rahul! You're verified. How can I help you today?",
    timestamp: "4:32 PM",
  },
  {
    id: "lm2",
    sender: "user",
    senderName: "Rahul Mehta",
    text: "Can you check the status of my personal loan application?",
    timestamp: "4:32 PM",
  },
  {
    id: "lm3",
    sender: "assistant",
    senderName: "Kubera",
    text: "Your personal loan application is under final review. A decision is expected within 2 working days.",
    timestamp: "4:33 PM",
  },
  {
    id: "lm4",
    sender: "user",
    senderName: "Rahul Mehta",
    text: "Perfect, thank you.",
    timestamp: "4:33 PM",
  },
];

const emiMessages: Message[] = [
  {
    id: "em1",
    sender: "assistant",
    senderName: "Kubera",
    text: "Hi Rahul! You're verified. How can I help you today?",
    timestamp: "11:15 AM",
  },
  {
    id: "em2",
    sender: "user",
    senderName: "Rahul Mehta",
    text: "When is my next EMI due?",
    timestamp: "11:15 AM",
  },
  {
    id: "em3",
    sender: "assistant",
    senderName: "Kubera",
    text: "Your next EMI of ₹12,450 is due on 28 September. Auto-debit is active.",
    timestamp: "11:16 AM",
  },
];

export const mockCalls: CallRecord[] = [
  {
    id: "call_1024",
    title: "Balance inquiry",
    intent: "balance",
    dateGroup: "Today",
    time: "10:24 AM",
    duration: "00:42",
    result: "Resolved",
    summary: balanceSummary,
    messages: mockConversation,
  },
  {
    id: "call_0932",
    title: "Loan status",
    intent: "loan",
    dateGroup: "Yesterday",
    time: "4:32 PM",
    duration: "01:31",
    result: "Resolved",
    summary: {
      status: "completed",
      identityVerified: true,
      intent: "Loan status",
      keyDetails: "Personal loan — under final review",
      outcome: "Resolved",
      escalated: false,
      highlights: [
        {
          id: "lh1",
          time: "4:32 PM",
          label: "User asked about loan application",
        },
        { id: "lh2", time: "4:33 PM", label: "Kubera shared review status" },
        { id: "lh3", time: "4:33 PM", label: "Call ended successfully" },
      ],
    },
    messages: loanMessages,
  },
  {
    id: "call_0914",
    title: "EMI due date",
    intent: "emi",
    dateGroup: "Sep 14",
    time: "11:15 AM",
    duration: "00:58",
    result: "Resolved",
    summary: {
      status: "completed",
      identityVerified: true,
      intent: "EMI due date",
      keyDetails: "Next EMI: ₹12,450 on 28 Sep",
      outcome: "Resolved",
      escalated: false,
      highlights: [
        { id: "eh1", time: "11:15 AM", label: "User asked for EMI due date" },
        {
          id: "eh2",
          time: "11:16 AM",
          label: "Kubera confirmed auto-debit is active",
        },
        { id: "eh3", time: "11:16 AM", label: "Call ended successfully" },
      ],
    },
    messages: emiMessages,
  },
  {
    id: "call_0912",
    title: "Card payment failed",
    intent: "payment",
    dateGroup: "Sep 12",
    time: "6:04 PM",
    duration: "02:10",
    result: "Escalated",
    summary: {
      status: "completed",
      identityVerified: true,
      intent: "Payment issue",
      keyDetails: "Failed transaction of ₹2,499",
      outcome: "Raised with payments team",
      escalated: true,
      highlights: [
        {
          id: "ph1",
          time: "6:04 PM",
          label: "User reported a failed card payment",
        },
        {
          id: "ph2",
          time: "6:05 PM",
          label: "Kubera verified transaction details",
        },
        {
          id: "ph3",
          time: "6:06 PM",
          label: "Case escalated to payments team",
        },
      ],
    },
    messages: [
      {
        id: "pm1",
        sender: "user",
        senderName: "Rahul Mehta",
        text: "A card payment of ₹2,499 failed but the amount was deducted.",
        timestamp: "6:04 PM",
      },
      {
        id: "pm2",
        sender: "assistant",
        senderName: "Kubera",
        text: "I can see the transaction. I have raised this with the payments team — you will get an update within 48 hours.",
        timestamp: "6:06 PM",
      },
    ],
  },
  {
    id: "call_0908",
    title: "Update mobile number",
    intent: "other",
    dateGroup: "Sep 8",
    time: "9:41 AM",
    duration: "01:04",
    result: "Resolved",
    summary: {
      status: "completed",
      identityVerified: true,
      intent: "Profile update",
      keyDetails: "Mobile number update requested",
      outcome: "Resolved",
      escalated: false,
      highlights: [
        {
          id: "oh1",
          time: "9:41 AM",
          label: "User requested a mobile number change",
        },
        { id: "oh2", time: "9:42 AM", label: "Kubera completed the update" },
      ],
    },
    messages: [
      {
        id: "om1",
        sender: "user",
        senderName: "Rahul Mehta",
        text: "I need to update my registered mobile number.",
        timestamp: "9:41 AM",
      },
      {
        id: "om2",
        sender: "assistant",
        senderName: "Kubera",
        text: "Done — your registered number has been updated and confirmed by SMS.",
        timestamp: "9:42 AM",
      },
    ],
  },
];

export const defaultPreferences = {
  voice: "Kubera",
  microphone: "Default microphone",
  speaker: "Default speaker",
  showTranscript: true,
  autoStartListening: false,
  speakerEnabled: true,
  theme: "system" as const,
};

import React, { useState } from "react";
import { AudioLines, Eye, EyeOff, Monitor, Moon, Sun } from "lucide-react";
import { useCall } from "../contexts/CallContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Switch } from "../components/ui/Switch";
import { Preferences } from "../types";
import { cn, maskAccountNumber } from "../lib/utils";
import { assistantProfiles } from "../data/mockConversation";

const microphones = [
  "Default microphone",
  "MacBook Pro Microphone",
  "AirPods Pro",
];
const speakers = ["Default speaker", "MacBook Pro Speakers", "AirPods Pro"];

const themes: Array<{
  id: Preferences["theme"];
  label: string;
  icon: typeof Sun;
}> = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="py-3.5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand/40 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const {
    preferences,
    updatePreferences,
    assistant,
    assistantIdentity,
    setAssistantIdentity,
    currentUser,
    isCallActive,
  } = useCall();
  const [showAccount, setShowAccount] = useState(false);

  const maskedAccount = currentUser.accountNumber
    ? maskAccountNumber(currentUser.accountNumber)
    : "•••• 1001";

  return (
    <section
      aria-label="Settings"
      className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 md:px-8"
    >
      <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Settings
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Control how {assistant.name} sounds, listens, and looks.
      </p>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader title="Profile" />
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {currentUser.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {currentUser.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">Verified profile</p>
            </div>
          </div>
          <div className="divide-y divide-line px-5 py-1">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <p className="text-sm font-medium text-ink">Account number</p>
              <span className="flex items-center gap-2">
                <span className="text-sm tabular-nums text-ink-muted">
                  {showAccount
                    ? (currentUser.accountNumber ?? "—")
                    : maskedAccount}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAccount((v) => !v)}
                  aria-label={
                    showAccount ? "Hide account number" : "Show account number"
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand"
                >
                  {showAccount ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <p className="text-sm font-medium text-ink">Email</p>
              <p className="min-w-0 truncate text-sm text-ink-muted">
                {currentUser.email ?? "—"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <p className="text-sm font-medium text-ink">Mobile number</p>
              <p className="text-sm text-ink-muted">
                {currentUser.mobile ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={<AudioLines className="h-4 w-4" aria-hidden="true" />}
            title="Voice settings"
          />

          <div className="divide-y divide-line px-5 py-1">
            <div className="py-4">
              <p className="text-sm font-medium text-ink">Voice</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isCallActive
                  ? "A call is in progress — this choice applies starting with your next call."
                  : "The assistant voice used on every call."}
              </p>
              <div
                className="mt-3 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Assistant voice"
              >
                {(["kanchana", "kubera"] as const).map((identity) => {
                  const profile = assistantProfiles[identity];
                  const isSelected = assistantIdentity === identity;
                  return (
                    <button
                      key={identity}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setAssistantIdentity(identity)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-brand/30 bg-brand-soft text-brand"
                          : "border-line bg-white text-ink-muted hover:text-ink",
                      )}
                    >
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                      />
                      <span className="truncate">
                        {profile.name}
                        <span className="block text-xs font-normal text-ink-muted">
                          {profile.gender}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Select
              id="microphone"
              label="Microphone"
              value={preferences.microphone}
              options={microphones}
              onChange={(microphone) => updatePreferences({ microphone })}
            />

            <Select
              id="speaker"
              label="Speaker"
              value={preferences.speaker}
              options={speakers}
              onChange={(speaker) => updatePreferences({ speaker })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Call preferences" />
          <div className="divide-y divide-line px-5 py-1">
            <Switch
              id="show-transcript"
              label="Show transcript"
              description="Keep the live conversation visible during calls."
              checked={preferences.showTranscript}
              onChange={(showTranscript) =>
                updatePreferences({ showTranscript })
              }
            />

            <Switch
              id="auto-listen"
              label="Auto-start listening"
              description="Begin listening as soon as a call connects."
              checked={preferences.autoStartListening}
              onChange={(autoStartListening) =>
                updatePreferences({ autoStartListening })
              }
            />

            <Switch
              id="speaker-enabled"
              label="Speaker enabled"
              description={`Play ${assistant.name}'s voice through your speaker.`}
              checked={preferences.speakerEnabled}
              onChange={(speakerEnabled) =>
                updatePreferences({ speakerEnabled })
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <div className="px-5 py-5">
            <p className="mb-3 text-sm font-medium text-ink">Theme</p>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Theme preference"
            >
              {themes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={preferences.theme === id}
                  onClick={() => updatePreferences({ theme: id })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-sm font-medium transition-colors",
                    preferences.theme === id
                      ? "border-brand/30 bg-brand-soft text-brand"
                      : "border-line bg-white text-ink-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

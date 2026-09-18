import React, { useEffect, useRef, useState } from "react";
import { Bot, Eye, EyeOff, LogOut, Menu, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useCall } from "../../contexts/CallContext";
import { cn, maskAccountNumber } from "../../lib/utils";
import { assistantProfiles } from "../../data/mockConversation";

interface HeaderProps {
  onOpenMenu: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const {
    assistant,
    assistantIdentity,
    setAssistantIdentity,
    currentUser,
    isCallActive,
    logout,
  } = useCall();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ...(unchanged effects and JSX above the profile dialog)...

  return (
    // ...unchanged header markup...
    // Inside the profile dialog, right after the "Manage profile & settings" Link:
    <>
      {/* existing <Link to="/settings">...</Link> */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setShowAccount(false);
          void logout();
        }}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Log out
      </button>
    </>
  );
}

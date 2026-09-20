import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Eye,
  EyeOff,
  Menu,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useCall } from "../../contexts/CallContext";
import { cn, maskAccountNumber } from "../../lib/utils";
import { assistantProfiles } from "../../data/assistants";

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
  } = useCall();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  /* ---------------------------------------------------------------------- */
  /* CLOSE PROFILE MENU                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
        setShowAccount(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setShowAccount(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  /* ---------------------------------------------------------------------- */
  /* ACCOUNT DISPLAY                                                        */
  /* ---------------------------------------------------------------------- */

  const accountDisplay = currentUser.accountNumber
    ? maskAccountNumber(currentUser.accountNumber)
    : currentUser.accountMasked ?? "—";

  const accountFullDisplay =
    currentUser.accountNumber ?? currentUser.accountMasked ?? "—";

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-16
        w-full
        shrink-0
        items-center
        justify-between
        gap-3
        border-b
        border-line
        bg-canvas/95
        px-3
        backdrop-blur
        sm:px-4
        md:px-6
      "
    >
      {/* ================================================================== */}
      {/* LEFT — MOBILE MENU + KAUTILYA BANK                                */}
      {/* ================================================================== */}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Mobile navigation */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-line
            bg-white
            text-ink-muted
            transition-colors
            hover:text-ink
            md:hidden
          "
        >
          <Menu
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          />
        </button>

        {/* KAUVTILYA logo */}
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            overflow-hidden
            rounded-full
            border
            border-line
            bg-white
            shadow-sm
          "
        >
          <img
            src="/app-image.png"
            alt="KAUTILYA BANK"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Bank name */}
        <div className="min-w-0">
          <p
            className="
              truncate
              text-[17px]
              font-bold
              leading-tight
              tracking-tight
              text-ink
            "
          >
            KAUTILYA BANK
          </p>

          <p
            className="
              hidden
              truncate
              text-xs
              text-ink-muted
              sm:block
            "
          >
            {assistant.name} · AI Voice Banking Assistant
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* RIGHT SIDE                                                         */}
      {/* ================================================================== */}

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* ================================================================ */}
        {/* KANCHANA / KUBERA CAPSULE                                       */}
        {/* ================================================================ */}

        <div
          className="
            flex
            shrink-0
            rounded-xl
            border
            border-line
            bg-white
            p-1
          "
          role="radiogroup"
          aria-label="Voice agent"
        >
          {(["kanchana", "kubera"] as const).map((identity) => {
            const profile = assistantProfiles[identity];

            const selected =
              assistantIdentity === identity;

            return (
              <button
                key={identity}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${profile.name} — ${profile.gender}`}
                disabled={isCallActive}
                onClick={() => setAssistantIdentity(identity)}
                className={cn(
                  `
                    flex
                    items-center
                    gap-1.5
                    rounded-lg
                    px-2
                    py-1
                    text-xs
                    font-semibold
                    transition-all
                    duration-200
                  `,
                  selected
                    ? "bg-brand-soft text-brand shadow-sm"
                    : "text-ink-muted hover:bg-slate-50 hover:text-ink",
                  isCallActive &&
                    "cursor-not-allowed opacity-60",
                )}
              >
                <img
                  src={profile.avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="
                    h-5
                    w-5
                    shrink-0
                    rounded-full
                    object-cover
                  "
                />

                <span className="hidden md:inline">
                  {profile.name}
                  <span className="hidden lg:inline">
                    {" "}
                    · {profile.gender}
                  </span>
                </span>

                <span className="md:hidden">
                  {profile.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* AI DISCLOSURE                                                     */}
        {/* ================================================================ */}

        <div
          className="
            hidden
            items-center
            gap-2
            rounded-full
            bg-brand-soft
            px-3
            py-1.5
            text-xs
            font-medium
            text-[#1D4FD7]
            lg:flex
          "
        >
          <Bot
            className="h-4 w-4"
            aria-hidden="true"
          />

          Automated assistant — not a human
        </div>

        {/* ================================================================ */}
        {/* PROFILE                                                          */}
        {/* ================================================================ */}

        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            aria-label={`Open profile for ${currentUser.name}`}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() =>
              setMenuOpen((previous) => !previous)
            }
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-line
              bg-white
              text-xs
              font-semibold
              text-ink-muted
              transition-colors
              hover:border-brand/30
              hover:text-brand
            "
          >
            {currentUser.initials}
          </button>

          {/* =============================================================== */}
          {/* PROFILE DROPDOWN                                                */}
          {/* =============================================================== */}

          {menuOpen && (
            <div
              role="dialog"
              aria-label="User profile"
              className="
                absolute
                right-0
                top-11
                z-50
                w-72
                rounded-2xl
                border
                border-line
                bg-white
                p-4
                shadow-soft
              "
            >
              {/* User */}
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-brand-soft
                    text-sm
                    font-bold
                    text-brand
                  "
                >
                  {currentUser.initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {currentUser.name}
                  </p>

                  <p className="mt-0.5 text-xs text-ink-muted">
                    Verified banking profile
                  </p>
                </div>
              </div>

              {/* Account */}
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-slate-50
                  px-3
                  py-2.5
                  text-xs
                  text-ink-muted
                "
              >
                <div className="flex items-center justify-between gap-2">
                  <p>
                    Account{" "}
                    {showAccount
                      ? accountFullDisplay
                      : accountDisplay}
                  </p>

                  {currentUser.accountNumber && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAccount(
                          (previous) => !previous,
                        )
                      }
                      aria-label={
                        showAccount
                          ? "Hide account number"
                          : "Show account number"
                      }
                      className="
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-ink-muted
                        transition-colors
                        hover:bg-brand-soft
                        hover:text-brand
                      "
                    >
                      {showAccount ? (
                        <EyeOff
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-1">
                  Profile data is private and secure.
                </p>
              </div>

              {/* Settings */}
              <Link
                to="/settings"
                onClick={() => {
                  setMenuOpen(false);
                  setShowAccount(false);
                }}
                className="
                  mt-4
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-brand-soft
                  px-3
                  py-2.5
                  text-sm
                  font-semibold
                  text-brand
                  transition-colors
                  hover:bg-[#E0EBFF]
                "
              >
                <Settings
                  className="h-4 w-4"
                  aria-hidden="true"
                />

                Manage profile & settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
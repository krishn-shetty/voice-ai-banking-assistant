import React from "react";
import {
  Clock,
  LogOut,
  Phone,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useCall } from "../../contexts/CallContext";
import { cn } from "../../lib/utils";

const navItems = [
  {
    to: "/",
    label: "Call",
    icon: Phone,
  },
  {
    to: "/history",
    label: "History",
    icon: Clock,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({
  onNavigate,
}: SidebarNavProps) {
  const { logout } = useCall();

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
  };

  return (
    <div className="flex h-full flex-col p-3">
      {/* ================================================================ */}
      {/* MAIN NAVIGATION                                                  */}
      {/* ================================================================ */}

      <nav
        aria-label="Primary"
        className="space-y-1"
      >
        {navItems.map(
          ({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  `
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-3.5
                    py-2.5
                    text-sm
                    font-medium
                    transition-colors
                  `,
                  isActive
                    ? "bg-brand-soft text-brand"
                    : "text-ink-muted hover:bg-slate-50 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      isActive
                        ? "text-brand"
                        : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />

                  {label}
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>

      {/* ================================================================ */}
      {/* PUSH LOGOUT TO BOTTOM                                            */}
      {/* ================================================================ */}

      <div className="flex-1" />

      {/* ================================================================ */}
      {/* LOGOUT                                                           */}
      {/* ================================================================ */}

      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          className="
            flex
            w-full
            items-center
            gap-3
            rounded-xl
            px-3.5
            py-2.5
            text-sm
            font-medium
            text-ink-muted
            transition-colors
            hover:bg-slate-50
            hover:text-ink
          "
        >
          <LogOut
            className="h-[18px] w-[18px] text-slate-400"
            aria-hidden="true"
          />

          Log out
        </button>
      </div>
    </div>
  );
}

export default SidebarNav;
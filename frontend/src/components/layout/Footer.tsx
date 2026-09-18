import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="flex shrink-0 items-center justify-start border-t border-line px-4 py-3 text-xs text-ink-muted">
      <p className="flex items-center gap-2 text-left">
        <ShieldCheck className="h-4 w-4 text-ok" aria-hidden="true" />
        <span>Secure. Private.</span>
      </p>
    </footer>);

}

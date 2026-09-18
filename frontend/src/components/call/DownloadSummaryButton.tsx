import React, { useState } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import { downloadCallSummary } from '../../lib/api';
import { useCall } from '../../contexts/CallContext';

export function DownloadSummaryButton({ callId }: {callId: string;}) {
  const { assistant } = useCall();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const onClick = async () => {
    setState('loading');
    try {
      await downloadCallSummary(callId, assistant.name);
      setState('done');
      setTimeout(() => setState('idle'), 2200);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'loading'}
      aria-label="Download call summary as PDF"
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-[#E0EBFF] disabled:opacity-70">
      
      {state === 'loading' ?
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> :
      state === 'done' ?
      <Check className="h-4 w-4" aria-hidden="true" /> :

      <Download className="h-4 w-4" aria-hidden="true" />
      }
      {state === 'loading' ?
      'Preparing summary…' :
      state === 'done' ?
      'Summary downloaded' :
      'Download Summary (PDF)'}
    </button>);

}

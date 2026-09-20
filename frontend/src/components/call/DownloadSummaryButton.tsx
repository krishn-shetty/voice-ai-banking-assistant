import React, { useState } from 'react';
import { Check, ChevronDown, Code, Download, FileText, Loader2 } from 'lucide-react';
import { downloadCallSummary } from '../../lib/api';
import { useCall } from '../../contexts/CallContext';

interface DownloadSummaryButtonProps {
  callId: string;
  ready?: boolean;
}

export function DownloadSummaryButton({
  callId,
  ready = true,
}: DownloadSummaryButtonProps) {
  const { assistant } = useCall();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'txt' | 'json'>('pdf');
  const [optionsOpen, setOptionsOpen] = useState(false);

  const handleDownload = async (format: 'pdf' | 'txt' | 'json' = downloadFormat) => {
    if (!ready || state === 'loading') return;
    setState('loading');
    setOptionsOpen(false);
    try {
      await downloadCallSummary(callId, assistant.name, format);
      setState('done');
      setTimeout(() => setState('idle'), 2200);
    } catch (err) {
      console.error('Failed to download summary:', err);
      setState('idle');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleDownload(downloadFormat)}
          disabled={!ready || state === 'loading'}
          aria-label={`Download call summary as ${downloadFormat.toUpperCase()}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand transition-colors hover:bg-[#E0EBFF] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : state === 'done' ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          {state === 'loading'
            ? 'Preparing summary…'
            : state === 'done'
              ? 'Summary downloaded'
              : !ready
                ? 'Preparing Summary Download…'
                : `Download Summary (${downloadFormat.toUpperCase()})`}
        </button>

        {ready && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOptionsOpen((open) => !open)}
              disabled={state === 'loading'}
              aria-label="Select summary download format"
              className="flex items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft p-3 text-brand hover:bg-[#E0EBFF] disabled:opacity-60"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {optionsOpen && (
              <div className="absolute right-0 bottom-full mb-2 z-20 w-44 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadFormat('pdf');
                    handleDownload('pdf');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-slate-100"
                >
                  <FileText className="h-3.5 w-3.5 text-brand" />
                  <span>PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadFormat('txt');
                    handleDownload('txt');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-slate-100"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Text File (.txt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadFormat('json');
                    handleDownload('json');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-slate-100"
                >
                  <Code className="h-3.5 w-3.5 text-slate-500" />
                  <span>JSON Data (.json)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

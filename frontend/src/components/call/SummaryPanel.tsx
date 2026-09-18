import React from 'react';
import { CallSummary } from '../../types';
import { CallSummaryCard } from './CallSummaryCard';
import { HighlightsCard } from './HighlightsCard';
import { DownloadSummaryButton } from './DownloadSummaryButton';

interface SummaryPanelProps {
  summary: CallSummary;
  callId: string;
  ready?: boolean;
  showHighlights?: boolean;
}

export function SummaryPanel({
  summary,
  callId,
  ready = true,
  showHighlights = true
}: SummaryPanelProps) {
  return (
    <div className="space-y-4">
      <CallSummaryCard summary={summary} ready={ready} />
      {showHighlights && <HighlightsCard highlights={summary.highlights} />}
      <DownloadSummaryButton callId={callId} />
    </div>);

}

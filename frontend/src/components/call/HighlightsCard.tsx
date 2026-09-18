import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Highlight } from '../../types';
import { useCall } from '../../contexts/CallContext';

interface HighlightsCardProps {
  highlights: Highlight[];
  scrollable?: boolean;
}

export function HighlightsCard({ highlights, scrollable = false }: HighlightsCardProps) {
  const { assistant } = useCall();
  return (
    <Card>
      <CardHeader
        icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
        title="Conversation highlights" />
      
      <ol
        className={
          scrollable ?
          'kubera-scroll relative max-h-[360px] overflow-x-hidden overflow-y-auto px-5 py-4' :
          'relative px-5 py-4'
        }>
        <span
          aria-hidden="true"
          className="absolute bottom-8 left-[25px] top-7 w-px bg-line" />
        
        {highlights.map((h) =>
        <li key={h.id} className="relative flex items-start gap-3 py-2 pl-0">
            <span
            aria-hidden="true"
            className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand ring-4 ring-white" />
          
            <span className="w-[68px] shrink-0 text-xs font-medium tabular-nums text-ink-muted">
              {h.time}
            </span>
            <span className="min-w-0 break-words text-sm leading-relaxed text-ink">{h.label.replace(/\bKubera\b/g, assistant.name)}</span>
          </li>
        )}
      </ol>
    </Card>);

}

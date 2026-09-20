import React from 'react';
import { motion } from 'framer-motion';
import { CallStatus } from '../../types';
import { cn, formatDuration } from '../../lib/utils';
import { useCall } from '../../contexts/CallContext';

const labels: Record<CallStatus, string> = {
  ready: 'Ready',
  CONNECTING: 'Connecting…',
  LISTENING: 'Listening…',
  THINKING: 'Thinking…',
  SPEAKING: 'Speaking…',
  ENDED: 'Call ended',
  connecting: 'Connecting…',
  connected: 'Connected',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  ended: 'Call ended'
};

interface CallStatusPillProps {
  status: CallStatus;
  duration: number;
  showDuration?: boolean;
  compact?: boolean;
  align?: 'start' | 'center' | 'end';
}

export function CallStatusPill({ status, duration, showDuration = true, compact = false, align = 'center' }: CallStatusPillProps) {
  const { assistant } = useCall();
  const isSpeakingStatus = status === 'SPEAKING' || status === 'speaking';
  const isThinkingStatus = status === 'THINKING' || status === 'thinking';
  const isListeningStatus = status === 'LISTENING' || status === 'listening' || status === 'connected';
  const isConnectingStatus = status === 'CONNECTING' || status === 'connecting';
  const live = isSpeakingStatus || isThinkingStatus || isListeningStatus;

  return (
    <div className={cn('flex flex-col', align === 'end' ? 'items-end' : align === 'start' ? 'items-start' : 'items-center', compact ? 'gap-0.5' : 'gap-1')}>
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full border font-medium',
          compact ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
          live ?
          'border-ok/25 bg-ok-soft text-[#047857]' :
          isConnectingStatus ?
          'border-brand/20 bg-brand-soft text-[#1D4FD7]' :
          'border-line bg-white text-ink-muted'
        )}
        role="status"
        aria-live="polite">
        
        <motion.span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            isSpeakingStatus ? 'bg-cyan-400' : isThinkingStatus ? 'bg-amber-400' : live ? 'bg-ok' : isConnectingStatus ? 'bg-brand' : 'bg-slate-300'
          )}
          animate={live || isConnectingStatus ? { opacity: [1, 0.35, 1], scale: [1, 0.9, 1] } : { opacity: 1 }}
          transition={{ duration: 1.6, repeat: live || isConnectingStatus ? Infinity : 0, ease: 'easeInOut' }} />
        
        <span className="whitespace-nowrap">
          {isSpeakingStatus
            ? `${assistant.name} is speaking…`
            : isThinkingStatus
            ? `${assistant.name} is thinking…`
            : labels[status] ?? 'Connected'}
        </span>
      </div>
      {showDuration &&
      <p className={cn('font-medium tabular-nums text-ink-muted whitespace-nowrap', compact ? 'text-[11px]' : 'text-xs')}>
          {formatDuration(duration)}
        </p>
      }
    </div>);

}

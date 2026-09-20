import React from 'react';
import { motion } from 'framer-motion';
import { Waveform } from './Waveform';
import { useCall } from '../../contexts/CallContext';
import { cn } from '../../lib/utils';

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'connecting' | 'ended';
type VoiceActivityState = 'ready' | 'connecting' | 'listening' | 'thinking' | 'speaking';

const idleGlow = '0 0 0 1px rgba(37, 99, 235, 0.15), 0 8px 24px rgba(37, 99, 235, 0.10)';
const listeningGlow = '0 0 0 2px rgba(96, 165, 250, 0.20), 0 8px 26px rgba(37, 99, 235, 0.14)';
const thinkingGlow = '0 0 0 2px rgba(251, 191, 36, 0.30), 0 8px 26px rgba(245, 158, 11, 0.16)';
const speakingGlowStart = '0 0 0 2px rgba(56, 189, 248, 0.34), 0 8px 26px rgba(37, 99, 235, 0.18)';
const speakingGlowPeak = '0 0 0 7px rgba(34, 211, 238, 0.16), 0 10px 32px rgba(14, 165, 233, 0.24)';

const avatarRingTone: Record<AvatarState, string> = {
  idle: 'ring-brand/15',
  listening: 'ring-sky-300/50',
  thinking: 'ring-amber-300/60',
  speaking: 'ring-cyan-300/70',
  connecting: 'ring-brand/35',
  ended: 'ring-slate-200'
};

export function VoiceArea({ compact = false, hideStatusPill = false }: {compact?: boolean; hideStatusPill?: boolean;}) {
  const { isSpeaking, isListening, callStatus, assistant } = useCall();
  const isSpeakingState = callStatus === 'SPEAKING' || callStatus === 'speaking' || isSpeaking;
  const isThinkingState = callStatus === 'THINKING' || callStatus === 'thinking';
  const isListeningState = callStatus === 'LISTENING' || callStatus === 'listening' || isListening;
  const isConnectingState = callStatus === 'CONNECTING' || callStatus === 'connecting';
  const isEndedState = callStatus === 'ENDED' || callStatus === 'ended';

  const avatarState: AvatarState = isSpeakingState ?
  'speaking' :
  isThinkingState ?
  'thinking' :
  isListeningState ?
  'listening' :
  isConnectingState ?
  'connecting' :
  isEndedState ?
  'ended' :
  'idle';

  const restingGlow = avatarState === 'thinking' ? thinkingGlow : avatarState === 'listening' ? listeningGlow : idleGlow;
  const voiceActivity: VoiceActivityState = isConnectingState ?
  'connecting' :
  isSpeakingState ?
  'speaking' :
  isThinkingState ?
  'thinking' :
  isListeningState ?
  'listening' :
  'ready';

  const activityCopy: Record<VoiceActivityState, string> = {
    ready: 'Ready',
    connecting: 'Connecting…',
    listening: 'Listening…',
    thinking: `${assistant.name} is thinking…`,
    speaking: `${assistant.name} is speaking…`
  };
  const activityDot = {
    ready: 'bg-slate-300',
    connecting: 'bg-brand',
    listening: 'bg-ok',
    thinking: 'bg-amber-400',
    speaking: 'bg-cyan-400'
  };

  return (
    <div className={cn('voice-area flex flex-col items-center', compact && 'voice-area--compact')}>
      <div className="relative shrink-0">
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-r from-blue-400/20 via-cyan-300/30 to-blue-400/20 blur-xl"
          animate={
            avatarState === 'speaking' ?
            { opacity: [0.22, 0.62, 0.22], scale: [0.94, 1.08, 0.94], rotate: [0, 8, 0] } :
            { opacity: avatarState === 'listening' ? 0.18 : 0.08, scale: 1, rotate: 0 }
          }
          transition={
            avatarState === 'speaking' ?
            { duration: 1.7, repeat: Infinity, ease: 'easeInOut' } :
            { duration: 0.15, ease: 'easeOut' }
          } />

        {avatarState === 'speaking' &&
        <>
            <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full border border-cyan-300/60"
            initial={{ scale: 1, opacity: 0.52 }}
            animate={{ scale: [1, 1.2], opacity: [0.52, 0] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: 'easeOut' }} />
            <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3 rounded-full border border-sky-300/35"
            initial={{ scale: 0.96, opacity: 0.3 }}
            animate={{ scale: [0.96, 1.18], opacity: [0.3, 0] }}
            transition={{ duration: 1.45, delay: 0.72, repeat: Infinity, ease: 'easeOut' }} />
          </>

        }
        <motion.div
          className={cn(
            'relative z-10 rounded-full bg-brand-soft p-2.5 ring-1',
            avatarRingTone[avatarState],
            compact ? 'p-1' : 'p-2.5'
          )}
          animate={
            avatarState === 'speaking' ?
            {
              boxShadow: [speakingGlowStart, speakingGlowPeak, speakingGlowStart],
              scale: [1, 1.018, 1]
            } :
            { boxShadow: restingGlow, scale: 1 }
          }
          transition={
            avatarState === 'speaking' ?
            { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } :
            { duration: 0.12, ease: 'easeOut' }
          }>
          
          <img
            src={assistant.avatarUrl}
            alt={`${assistant.name}, your AI voice banking assistant`}
            className={cn(
              'rounded-full border-4 border-white object-cover',
              compact ? 'voice-area__image--compact' : 'h-[188px] w-[188px]'
            )} />
          
        </motion.div>
      </div>

      <div className="voice-area__details min-w-0">
        <Waveform
          active={isSpeaking || isListening}
          size={compact ? 'sm' : 'md'}
          barClassName={isListening && !isSpeaking ? 'bg-ok' : undefined}
          ariaLabel={
            voiceActivity === 'listening' ? 'User voice active' :
            voiceActivity === 'speaking' ? `${assistant.name} voice active` :
            'Voice activity idle'
          }
          className={cn('voice-area__waveform', compact ? 'mt-0.5 h-6' : 'mt-5 h-11')} />
        

        <p className={cn('voice-area__name truncate font-bold tracking-tight text-ink', compact ? 'mt-0.5 text-base' : 'mt-2 text-xl')}>
          {assistant.name}
        </p>
        <p className="voice-area__description truncate text-xs text-ink-muted">AI Voice Banking Assistant</p>

        {!hideStatusPill &&
        <p
          className="voice-area__status mt-2 flex min-h-[20px] min-w-[168px] items-center justify-center gap-1.5 text-[13px] font-medium text-ink-muted"
          role="status"
          aria-live="polite">
          <motion.span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full',
              activityDot[voiceActivity]
            )} />
          
          {activityCopy[voiceActivity]}
        </p>
        }
      </div>
    </div>);

}

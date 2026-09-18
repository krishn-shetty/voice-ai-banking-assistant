import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import { cn, formatDuration } from '../../lib/utils';

function SecondaryButton({
  onClick,
  label,
  state,
  ariaLabel,
  active,
  children







}: {onClick: () => void;label: string;state: string;ariaLabel: string;active: boolean;children: React.ReactNode;}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={active}
        title={`${label} · ${state}`}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full border transition-colors',
          active ?
          'border-brand/25 bg-brand-soft text-brand' :
          'border-line bg-white text-ink-muted hover:text-ink'
        )}>
        
        {children}
      </button>
      <p className="whitespace-nowrap text-center text-[11px] font-medium text-ink min-[375px]:text-xs">{label}</p>
      <p className="-mt-1 text-center text-[11px] text-ink-muted">{state}</p>
    </div>);

}

export function CallControls() {
  const {
    isCallActive,
    isMuted,
    isSpeakerOn,
    toggleCall,
    toggleMute,
    toggleSpeaker,
    callStatus,
    callDuration,
    isListening
  } = useCall();
  const [callButtonPulsing, setCallButtonPulsing] = useState(false);

  const listeningActive = isCallActive && isListening;
  const restingCallShadow = isCallActive ?
  '0 0 0 10px rgba(239,68,68,0.10), 0 10px 24px rgba(239,68,68,0.20)' :
  '0 0 0 10px rgba(37,99,235,0.08), 0 10px 24px rgba(37,99,235,0.18)';
  const handleCallToggle = () => {
    setCallButtonPulsing(true);
    toggleCall();
    window.setTimeout(() => setCallButtonPulsing(false), 520);
  };

  return (
    <div className="grid grid-cols-3 items-end gap-x-2 min-[375px]:gap-x-4 sm:gap-x-8">
      <SecondaryButton
        onClick={toggleMute}
        label="Microphone"
        state={isMuted ? 'Muted' : 'On'}
        ariaLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        active={!isMuted}>
        
        {isMuted ?
        <MicOff className="h-5 w-5" aria-hidden="true" /> :

        <Mic className="h-5 w-5" aria-hidden="true" />
        }
      </SecondaryButton>

      <div className="relative flex min-w-0 flex-col items-center gap-2">
        <motion.button
          type="button"
          onClick={handleCallToggle}
          whileTap={{ scale: 0.95 }}
          aria-label={isCallActive ? 'End call' : 'Start call'}
          title={isCallActive ? 'End call' : 'Start call'}
          className={cn(
            'flex items-center justify-center rounded-full text-white transition-colors',
            isCallActive ? 'h-16 w-16' : 'h-14 w-14',
            isCallActive ? 'bg-danger hover:bg-[#DC2626]' : 'bg-gradient-to-b from-[#3B82F6] via-brand to-[#1D4ED8] hover:from-[#60A5FA] hover:via-brand hover:to-[#1D4ED8]'
          )}
          animate={
            listeningActive ?
            {
              boxShadow: [
                '0 0 0 8px rgba(16,185,129,0.12), 0 10px 24px rgba(239,68,68,0.20)',
                '0 0 0 14px rgba(16,185,129,0.05), 0 10px 28px rgba(239,68,68,0.24)',
                '0 0 0 8px rgba(16,185,129,0.12), 0 10px 24px rgba(239,68,68,0.20)'
              ],
              scale: [1, 1.025, 1]
            } :
            !isCallActive ?
            {
              boxShadow: [
                '0 0 0 8px rgba(37,99,235,0.08), 0 10px 24px rgba(37,99,235,0.18)',
                '0 0 0 13px rgba(96,165,250,0.05), 0 12px 30px rgba(37,99,235,0.28)',
                '0 0 0 8px rgba(37,99,235,0.08), 0 10px 24px rgba(37,99,235,0.18)'
              ],
              scale: callButtonPulsing ? [1, 0.92, 1.05, 1] : [1, 1.025, 1]
            } :
            {
              boxShadow: restingCallShadow,
              scale: callButtonPulsing ? [1, 0.92, 1.05, 1] : 1,
              opacity: callButtonPulsing ? [1, 0.62, 1] : 1
            }
          }
          transition={
            listeningActive ?
            { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } :
            !isCallActive && !callButtonPulsing ?
            { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } :
            { duration: callButtonPulsing ? 0.5 : 0.15, ease: 'easeOut' }
          }>
          
          {isCallActive ?
          <PhoneOff className="h-7 w-7" aria-hidden="true" /> :

          <Mic className="h-7 w-7" aria-hidden="true" />
          }
        </motion.button>
        <p className="whitespace-nowrap text-sm font-semibold text-ink">
          {isCallActive ? 'End call' : callStatus === 'connecting' ? 'Connecting…' : 'Start call'}
        </p>
        <p className="-mt-1 flex items-center gap-1.5 text-xs tabular-nums text-ink-muted" aria-live="polite">
          {listeningActive &&
          <motion.span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-ok"
            animate={{ opacity: [1, 0.45, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
          }
          {listeningActive ? `Listening… · ${formatDuration(callDuration)}` : formatDuration(callDuration)}
        </p>
      </div>

      <SecondaryButton
        onClick={toggleSpeaker}
        label="Speaker"
        state={isSpeakerOn ? 'On' : 'Off'}
        ariaLabel="Toggle speaker"
        active={isSpeakerOn}>
        
        {isSpeakerOn ?
        <Volume2 className="h-5 w-5" aria-hidden="true" /> :

        <VolumeX className="h-5 w-5" aria-hidden="true" />
        }
      </SecondaryButton>
    </div>);

}

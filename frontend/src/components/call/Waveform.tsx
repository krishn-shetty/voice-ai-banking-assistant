import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface WaveformProps {
  active: boolean;
  bars?: number;
  className?: string;
  barClassName?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

const heights = [10, 18, 28, 20, 34, 24, 40, 26, 34, 18, 26, 14];

export function Waveform({
  active,
  bars = heights.length,
  className,
  barClassName,
  size = 'md',
  ariaLabel
}: WaveformProps) {
  const scale = size === 'sm' ? 0.34 : 1;

  return (
    <div
      className={cn('flex items-center justify-center gap-[3px]', className)}
      role="img"
      aria-label={ariaLabel ?? (active ? 'Assistant voice active' : 'Assistant voice idle')}>
      
      {heights.slice(0, bars).map((h, i) => {
        const peak = Math.max(6, h * scale);
        const idle = Math.max(4, peak * 0.22);
        return (
          <motion.span
            key={i}
            className={cn('w-[3px] rounded-full bg-brand', barClassName)}
            animate={{ height: active ? [idle, peak, idle * 1.4, peak * 0.7, idle] : idle }}
            transition={
            active ?
            {
              duration: 1.1 + i % 4 * 0.12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.05
            } :
            { duration: 0.3, ease: 'easeOut' }
            }
            style={{ height: idle }} />);


      })}
    </div>);

}

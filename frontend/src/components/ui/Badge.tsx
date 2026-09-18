import React from 'react';
import { cn } from '../../lib/utils';

type BadgeTone = 'success' | 'neutral' | 'brand' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  success: 'bg-ok-soft text-[#047857]',
  neutral: 'bg-slate-100 text-ink-muted',
  brand: 'bg-brand-soft text-brand',
  danger: 'bg-danger-soft text-[#B91C1C]'
};

export function Badge({ tone = 'neutral', children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        toneStyles[tone],
        className
      )}>
      
      {icon}
      {children}
    </span>);

}
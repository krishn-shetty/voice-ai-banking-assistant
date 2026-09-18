import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export function Switch({ checked, onChange, label, description, id }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-brand' : 'bg-slate-200'
        )}>
        
        <span
          className={cn(
            'inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
          )} />
        
      </button>
    </div>);

}
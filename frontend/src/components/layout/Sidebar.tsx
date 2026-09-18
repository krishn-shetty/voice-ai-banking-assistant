import React from 'react';
import { NavLink } from 'react-router-dom';
import { Clock, Phone, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
{ to: '/', label: 'Call', icon: Phone },
{ to: '/history', label: 'History', icon: Clock },
{ to: '/settings', label: 'Settings', icon: Settings }];


export function SidebarNav({ onNavigate }: {onNavigate?: () => void;}) {
  return (
    <div className="p-3">
      <nav aria-label="Primary" className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) =>
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
            isActive ?
            'bg-brand-soft text-brand' :
            'text-ink-muted hover:bg-slate-50 hover:text-ink'
          )
          }>
          
            {({ isActive }) =>
          <>
                <Icon
              className={cn('h-[18px] w-[18px]', isActive ? 'text-brand' : 'text-slate-400')}
              aria-hidden="true" />
            
                {label}
              </>
          }
          </NavLink>
        )}
      </nav>

    </div>);

}

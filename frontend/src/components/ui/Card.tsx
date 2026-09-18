import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={cn('rounded-2xl border border-line bg-white shadow-card', className)}>
      {children}
    </Tag>);

}

export function CardHeader({
  icon,
  title,
  action




}: {icon?: React.ReactNode;title: string;action?: React.ReactNode;}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon &&
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
            {icon}
          </span>
        }
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>);

}
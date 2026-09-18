import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CallSummary } from '../../types';

function Row({ label, value }: {label: string;value: React.ReactNode;}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>);

}

export function CallSummaryCard({
  summary,
  ready = true



}: {summary: CallSummary;ready?: boolean;}) {
  return (
    <Card>
      <CardHeader
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        title="Call Summary"
        action={
        ready ?
        <motion.span
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}>
          
              <Badge tone="success" icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}>
                Completed
              </Badge>
            </motion.span> :

        <Badge tone="brand">In progress</Badge>

        } />
      
      <dl className="px-5 py-1">
        <Row
          label="Identity verified"
          value={summary.identityVerified ? 'Yes' : <span className="text-danger">No</span>} />
        
        <Row label="Intent" value={summary.intent} />
        <Row label="Key details" value={summary.keyDetails} />
        <Row label="Outcome" value={summary.outcome} />
        <Row
          label="Escalated"
          value={
          summary.escalated ?
          <Badge tone="danger">Yes</Badge> :

          <Badge tone="success">No</Badge>

          } />
        
      </dl>
    </Card>);

}
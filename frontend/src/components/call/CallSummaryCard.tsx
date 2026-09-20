import React from 'react';
import { motion } from 'framer-motion';
import { Check, FileText, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CallSummary } from '../../types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-sm text-ink-muted w-1/3">{label}</dt>
      <dd className="text-left sm:text-right text-sm font-medium text-ink w-2/3">{value}</dd>
    </div>
  );
}

export function CallSummaryCard({
  summary,
  ready = true,
}: {
  summary?: CallSummary | null;
  ready?: boolean;
}) {
  const isReady = ready && !!summary;

  return (
    <Card>
      <CardHeader
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        title="Call Summary"
        action={
          isReady ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Badge tone="success" icon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}>
                Completed
              </Badge>
            </motion.span>
          ) : (
            <Badge tone="brand" icon={<Loader2 className="h-3 w-3 animate-spin text-brand" aria-hidden="true" />}>
              Generating summary…
            </Badge>
          )
        }
      />

      {isReady ? (
        <dl className="px-5 py-1">
          <Row
            label="Identity verified"
            value={summary.identityVerified ? 'Yes' : <span className="text-danger">No</span>}
          />
          <Row label="Primary Intent" value={summary.primaryIntent || '—'} />
          {summary.additionalIntents?.length > 0 && (
            <Row label="Additional Intents" value={summary.additionalIntents.join(', ')} />
          )}
          {summary.keyDetails?.length > 0 && (
            <Row
              label="Key Details"
              value={
                <ul className="list-disc list-inside text-left sm:text-right">
                  {summary.keyDetails.map((detail, idx) => (
                    <li key={idx} className="whitespace-pre-wrap">
                      {detail}
                    </li>
                  ))}
                </ul>
              }
            />
          )}
          {summary.actionsPerformed?.length > 0 && (
            <Row
              label="Actions Performed"
              value={
                <ul className="list-disc list-inside text-left sm:text-right">
                  {summary.actionsPerformed.map((action, idx) => (
                    <li key={idx} className="whitespace-pre-wrap">
                      {action}
                    </li>
                  ))}
                </ul>
              }
            />
          )}
          {summary.paymentPromise && (
            <Row label="Payment Promise" value={summary.paymentPromise} />
          )}
          <Row label="Outcome" value={summary.outcome || 'Completed'} />
          <Row
            label="Escalated"
            value={
              summary.escalated ? (
                <Badge tone="danger">Yes</Badge>
              ) : (
                <Badge tone="success">No</Badge>
              )
            }
          />
        </dl>
      ) : (
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
            <span>Analyzing call transcript and generating AI summary…</span>
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      )}
    </Card>
  );
}
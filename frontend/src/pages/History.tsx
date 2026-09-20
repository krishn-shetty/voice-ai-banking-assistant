import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Loader2, Search } from 'lucide-react';
import { CallIntent, CallRecord } from '../types';
import { getCallHistory } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { useCall } from '../contexts/CallContext';

const filters: Array<{id: 'all' | CallIntent;label: string;}> = [
{ id: 'all', label: 'All' },
{ id: 'balance', label: 'Balance' },
{ id: 'loan', label: 'Loan' },
{ id: 'emi', label: 'EMI' },
{ id: 'payment', label: 'Payment' },
{ id: 'other', label: 'Other' }];


export function HistoryPage() {
  const { assistant } = useCall();
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | CallIntent>('all');

  useEffect(() => {
    let cancelled = false;
    getCallHistory().
    then((data) => !cancelled && setCalls(data)).
    catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    if (!calls) return [];
    const filtered = calls.filter((c) => {
      const matchesFilter = filter === 'all' || c.intent === filter;
      const matchesQuery =
      !query.trim() ||
      `${c.title} ${c.summary.primaryIntent} ${c.summary.keyDetails.join(" ")}`.
      toLowerCase().
      includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });
    const groups: Array<{label: string;items: CallRecord[];}> = [];
    filtered.forEach((call) => {
      const group = groups.find((g) => g.label === call.dateGroup);
      if (group) group.items.push(call);else
      groups.push({ label: call.dateGroup, items: [call] });
    });
    return groups;
  }, [calls, filter, query]);

  return (
    <section aria-label="Call history" className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Call History</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Every conversation with {assistant.name}, with summaries you can download.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-card focus-within:border-brand/40">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <label htmlFor="history-search" className="sr-only">
          Search calls
        </label>
        <input
          id="history-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search calls…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none" />
        
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter calls by intent">
        {filters.map(({ id, label }) =>
        <button
          key={id}
          type="button"
          onClick={() => setFilter(id)}
          aria-pressed={filter === id}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
            filter === id ?
            'border-brand/25 bg-brand-soft text-brand' :
            'border-line bg-white text-ink-muted hover:text-ink'
          )}>
          
            {label}
          </button>
        )}
      </div>

      {error &&
      <p className="mt-10 rounded-2xl border border-line bg-white p-5 text-sm text-danger">
          We couldn&apos;t load your call history. Please try again.
        </p>
      }

      {!calls && !error &&
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading calls…
        </div>
      }

      {calls && grouped.length === 0 &&
      <div className="mt-10 rounded-2xl border border-line bg-white p-8 text-center">
          <Clock className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-ink">No calls match your search</p>
          <p className="mt-1 text-xs text-ink-muted">Try a different keyword or filter.</p>
        </div>
      }

      <div className="mt-6 space-y-7">
        {grouped.map((group) =>
        <div key={group.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {group.label}
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              {group.items.map((call) =>
            <li key={call.id} className="border-b border-line last:border-0">
                  <Link
                to={`/history/${call.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50">
                
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {call.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {call.time} · {call.duration}
                      </span>
                    </span>
                    <Badge tone={call.result === 'Resolved' ? 'success' : 'neutral'}>
                      {call.result}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </Link>
                </li>
            )}
            </ul>
          </div>
        )}
      </div>
    </section>);

}

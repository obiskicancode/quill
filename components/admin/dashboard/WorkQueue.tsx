'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { FOCUS_RING } from '@/components/admin/clickableRow';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type {
  AttentionItem,
  DashboardReservationRow,
} from '@/types/dashboard.types';

interface WorkItem {
  key: string;
  label: string;
  count: number;
  meta: string;
  href: string;
  urgent: boolean;
}

interface WorkQueueProps {
  attention: AttentionItem[];
  arrivals: DashboardReservationRow[];
}

const ARRIVALS_BY_TYPE = new Set(['checked_in', 'cancelled', 'no_show']);

/**
 * The queue is the one block on this page a staff member acts on rather than
 * reads, so it leads the dashboard. Arrivals still open today are counted here
 * from rows the summary already carries; the rest comes from the server's
 * prioritised attention feed.
 */
export function WorkQueue({ attention, arrivals }: WorkQueueProps) {
  const uncheckedArrivals = arrivals.filter(
    (row) => !ARRIVALS_BY_TYPE.has(row.status),
  ).length;

  const items: WorkItem[] = [
    ...(uncheckedArrivals > 0
      ? [
          {
            key: 'arrivals_open',
            label: 'Arrivals today not checked in',
            count: uncheckedArrivals,
            meta: 'Due in today',
            href: '/admin/reservations?filter=arriving_today',
            urgent: true,
          },
        ]
      : []),
    ...attention.map((item) => ({
      key: item.type,
      label: item.label,
      count: item.count,
      meta: `Oldest ${item.oldestAge}`,
      href: item.href,
      urgent: item.priority <= 3,
    })),
  ];

  if (items.length === 0) {
    return (
      <section aria-label="Today's work queue">
        <Alert variant="success" size="sm" className="items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <AlertTitle className="font-semibold">
            Work queue is clear — nothing is waiting on staff action.
          </AlertTitle>
        </Alert>
      </section>
    );
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-labelledby="work-queue-heading"
      className="rounded-card border border-line bg-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2
          id="work-queue-heading"
          className="font-display text-h3 font-semibold text-ink"
        >
          Work queue
        </h2>
        <span className="text-caption text-muted-foreground">
          {total} {total === 1 ? 'item' : 'items'} waiting on staff
        </span>
      </div>
      <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                'flex min-h-14 items-center gap-3 rounded-control border border-line bg-paper px-3 py-2 transition-colors hover:border-ink/30 hover:bg-card',
                FOCUS_RING,
              )}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-small font-bold',
                  item.urgent
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-ink/5 text-ink',
                )}
              >
                {item.count}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-small font-semibold text-ink">
                  {item.label}
                </span>
                <span className="block text-caption text-muted-foreground">
                  {item.meta}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

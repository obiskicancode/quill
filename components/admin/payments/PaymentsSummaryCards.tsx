'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Minus,
  RefreshCcw,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatMinor } from '@/lib/format';
import type { PaymentSummaryResponse } from '@/types/payments.types';

export function PaymentsSummaryCards({
  summary,
  loading = false,
  onRangeShortcut,
  selectedRange,
}: {
  summary: PaymentSummaryResponse | null;
  loading?: boolean;
  onRangeShortcut?: (shortcut: string) => void;
  selectedRange?: string;
}) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-card border border-line bg-card p-4"
          >
            <div className="mb-2 h-4 w-24 rounded-sm bg-line"></div>
            <div className="mb-1 h-7 w-32 rounded-sm bg-line"></div>
            <div className="h-3 w-20 rounded-sm bg-line"></div>
          </div>
        ))}
      </div>
    );
  }

  const { delta } = summary;

  return (
    <div className="space-y-3">
      {/* Date presets toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-small">
        <span className="font-semibold text-muted-foreground">
          Summary period:
        </span>
        <div className="inline-flex rounded-control border border-line bg-paper p-0.5 text-caption">
          {['today', '7d', 'this_month', 'last_month'].map((preset) => {
            const labels: Record<string, string> = {
              today: 'Today',
              '7d': 'Last 7 days',
              this_month: 'This month',
              last_month: 'Last month',
            };
            const active = selectedRange === preset;
            return (
              <Button
                key={preset}
                type="button"
                variant={active ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => onRangeShortcut?.(preset)}
                className="h-7 px-2.5"
              >
                {labels[preset]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Collected */}
        <div className="rounded-card border border-line bg-card p-4 shadow-raised">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Collected
            </span>
            <CreditCard className="size-4 text-success" />
          </div>
          <div className="mt-2 text-h3 font-bold text-ink">
            {formatMinor(summary.collectedMinor)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-caption">
            {delta.collectedPercent > 0 ? (
              <span className="flex items-center font-medium text-success">
                <ArrowUpRight className="size-3.5" /> +{delta.collectedPercent}%
              </span>
            ) : delta.collectedPercent < 0 ? (
              <span className="flex items-center font-medium text-destructive">
                <ArrowDownRight className="size-3.5" /> {delta.collectedPercent}
                %
              </span>
            ) : (
              <span className="flex items-center text-muted-foreground">
                <Minus className="size-3.5" /> 0%
              </span>
            )}
            <span className="text-muted-foreground">vs prior period</span>
          </div>
        </div>

        {/* 2. Refunds */}
        <div className="rounded-card border border-line bg-card p-4 shadow-raised">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Refunds Issued
            </span>
            <RefreshCcw className="size-4 text-warning" />
          </div>
          <div className="mt-2 text-h3 font-bold text-ink">
            {formatMinor(summary.refundsMinor)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-caption">
            {delta.refundsPercent > 0 ? (
              <span className="flex items-center font-medium text-destructive">
                <ArrowUpRight className="size-3.5" /> +{delta.refundsPercent}%
              </span>
            ) : delta.refundsPercent < 0 ? (
              <span className="flex items-center font-medium text-success">
                <ArrowDownRight className="size-3.5" /> {delta.refundsPercent}%
              </span>
            ) : (
              <span className="text-muted-foreground">Unchanged</span>
            )}
            <span className="text-muted-foreground">vs prior</span>
          </div>
        </div>

        {/* 3. Pending Bank Transfers */}
        <div className="rounded-card border border-line bg-card p-4 shadow-raised">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Pending Transfers
            </span>
            <Clock className="size-4 text-brand-ink" />
          </div>
          <div className="mt-2 text-h3 font-bold text-ink">
            {summary.pendingTransfersCount}
          </div>
          <div className="mt-1 text-caption text-muted-foreground">
            Totaling {formatMinor(summary.pendingTransfersMinor)}
          </div>
        </div>

        {/* 4. Failed Payments */}
        <div className="rounded-card border border-line bg-card p-4 shadow-raised">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Failed
            </span>
            <XCircle className="size-4 text-destructive" />
          </div>
          <div className="mt-2 text-h3 font-bold text-ink">
            {summary.failedCount}
          </div>
          <div className="mt-1 text-caption text-muted-foreground">
            Card declines & abandoned
          </div>
        </div>

        {/* 5. Awaiting Reconciliation */}
        <div className="rounded-card border border-line bg-card p-4 shadow-raised">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Needs Reconciliation
            </span>
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-h3 font-bold text-brand-ink">
            {summary.awaitingReconciledCount}
          </div>
          <div className="mt-1 text-caption text-muted-foreground">
            {formatMinor(summary.awaitingReconciledMinor)} cash & transfers
          </div>
        </div>
      </div>
    </div>
  );
}

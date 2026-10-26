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
import type { PaymentSummaryResponse } from '@/types/payments-admin.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

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
            className="rounded-card border-line bg-card animate-pulse border p-4"
          >
            <div className="bg-line mb-2 h-4 w-24 rounded"></div>
            <div className="bg-line mb-1 h-7 w-32 rounded"></div>
            <div className="bg-line h-3 w-20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const { delta } = summary;

  return (
    <div className="space-y-3">
      {/* Date presets toolbar */}
      <div className="text-small flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground font-semibold">
          Summary period:
        </span>
        <div className="border-line bg-paper text-caption inline-flex rounded-lg border p-0.5">
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
                variant={active ? 'default' : 'ghost'}
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
        <div className="rounded-card border-line bg-card border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Collected
            </span>
            <CreditCard className="text-success size-4" />
          </div>
          <div className="text-h3 text-ink mt-2 font-bold">
            {formatNaira(summary.collectedMinor)}
          </div>
          <div className="text-caption mt-1 flex items-center gap-1">
            {delta.collectedPercent > 0 ? (
              <span className="text-success flex items-center font-medium">
                <ArrowUpRight className="size-3.5" /> +{delta.collectedPercent}%
              </span>
            ) : delta.collectedPercent < 0 ? (
              <span className="text-destructive flex items-center font-medium">
                <ArrowDownRight className="size-3.5" /> {delta.collectedPercent}
                %
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center">
                <Minus className="size-3.5" /> 0%
              </span>
            )}
            <span className="text-muted-foreground">vs prior period</span>
          </div>
        </div>

        {/* 2. Refunds */}
        <div className="rounded-card border-line bg-card border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Refunds Issued
            </span>
            <RefreshCcw className="text-warning size-4" />
          </div>
          <div className="text-h3 text-ink mt-2 font-bold">
            {formatNaira(summary.refundsMinor)}
          </div>
          <div className="text-caption mt-1 flex items-center gap-1">
            {delta.refundsPercent > 0 ? (
              <span className="text-destructive flex items-center font-medium">
                <ArrowUpRight className="size-3.5" /> +{delta.refundsPercent}%
              </span>
            ) : delta.refundsPercent < 0 ? (
              <span className="text-success flex items-center font-medium">
                <ArrowDownRight className="size-3.5" /> {delta.refundsPercent}%
              </span>
            ) : (
              <span className="text-muted-foreground">Unchanged</span>
            )}
            <span className="text-muted-foreground">vs prior</span>
          </div>
        </div>

        {/* 3. Pending Bank Transfers */}
        <div className="rounded-card border-line bg-card border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Pending Transfers
            </span>
            <Clock className="text-brand-ink size-4" />
          </div>
          <div className="text-h3 text-ink mt-2 font-bold">
            {summary.pendingTransfersCount}
          </div>
          <div className="text-caption text-muted-foreground mt-1">
            Totaling {formatNaira(summary.pendingTransfersMinor)}
          </div>
        </div>

        {/* 4. Failed Payments */}
        <div className="rounded-card border-line bg-card border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Failed
            </span>
            <XCircle className="text-destructive size-4" />
          </div>
          <div className="text-h3 text-ink mt-2 font-bold">
            {summary.failedCount}
          </div>
          <div className="text-caption text-muted-foreground mt-1">
            Card declines & abandoned
          </div>
        </div>

        {/* 5. Awaiting Reconciliation */}
        <div className="rounded-card border-line bg-card border p-4 shadow-sm">
          <div className="text-muted-foreground flex items-center justify-between">
            <span className="text-caption font-semibold tracking-wider uppercase">
              Needs Reconciliation
            </span>
            <CheckCircle2 className="text-primary size-4" />
          </div>
          <div className="text-h3 text-primary mt-2 font-bold">
            {summary.awaitingReconciledCount}
          </div>
          <div className="text-caption text-muted-foreground mt-1">
            {formatNaira(summary.awaitingReconciledMinor)} cash & transfers
          </div>
        </div>
      </div>
    </div>
  );
}

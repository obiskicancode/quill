'use client';

import { Progress } from '@/components/ui/progress';
import { formatMinor } from '@/lib/format';
import type { PaymentsBreakdownResponse } from '@/types/payments.types';

/** Payment breakdown by method, provider and day. */
export function PaymentsBreakdown({
  breakdown,
  loading = false,
}: {
  breakdown: PaymentsBreakdownResponse | null;
  loading?: boolean;
}) {
  if (loading || !breakdown) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-44 animate-pulse rounded-card border border-line bg-card p-4"></div>
        <div className="h-44 animate-pulse rounded-card border border-line bg-card p-4"></div>
        <div className="h-44 animate-pulse rounded-card border border-line bg-card p-4"></div>
      </div>
    );
  }

  const { byMethod, byProvider, dailyStrip } = breakdown;
  const maxDailyCollected = Math.max(
    ...dailyStrip.map((d) => d.collectedMinor),
    1,
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. By Method */}
      <div className="rounded-card border border-line bg-card p-4 shadow-raised">
        <h3 className="text-small font-semibold text-ink">
          Volume by Payment Method
        </h3>
        <p className="mb-3 text-caption text-muted-foreground">
          Card, bank transfer, cash, and USSD
        </p>
        <div className="space-y-2.5">
          {byMethod.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-caption">
                <span className="font-medium text-ink">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatMinor(item.amountMinor)} ({item.percent}%)
                </span>
              </div>
              <Progress value={item.percent} aria-label={item.label} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. By Provider */}
      <div className="rounded-card border border-line bg-card p-4 shadow-raised">
        <h3 className="text-small font-semibold text-ink">
          Volume by Provider
        </h3>
        <p className="mb-3 text-caption text-muted-foreground">
          Paystack vs manual ledger entries
        </p>
        <div className="space-y-2.5">
          {byProvider.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-caption">
                <span className="font-medium text-ink">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatMinor(item.amountMinor)} ({item.percent}%)
                </span>
              </div>
              <Progress value={item.percent} aria-label={item.label} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Daily Strip */}
      <div className="rounded-card border border-line bg-card p-4 shadow-raised">
        <h3 className="text-small font-semibold text-ink">
          Recent Daily Collections
        </h3>
        <p className="mb-3 text-caption text-muted-foreground">
          Daily net inflows for selected period
        </p>
        <div className="flex h-24 items-end justify-between gap-1.5 pt-2">
          {dailyStrip.map((day) => {
            const heightPercent = Math.max(
              12,
              Math.round((day.collectedMinor / maxDailyCollected) * 100),
            );
            return (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center gap-1"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-8 z-10 hidden rounded-sm bg-ink px-1.5 py-0.5 text-micro whitespace-nowrap text-paper shadow-float group-hover:block">
                  {formatMinor(day.collectedMinor)} ({day.count})
                </div>
                <div className="flex h-16 w-full items-end justify-center rounded-t-control bg-paper">
                  <div
                    className="w-full max-w-5 rounded-t-control bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="truncate text-micro text-muted-foreground">
                  {day.label.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { PaymentsBreakdownResponse } from '@/types/payments-admin.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

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
        <div className="rounded-card border-line bg-card h-44 animate-pulse border p-4"></div>
        <div className="rounded-card border-line bg-card h-44 animate-pulse border p-4"></div>
        <div className="rounded-card border-line bg-card h-44 animate-pulse border p-4"></div>
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
      <div className="rounded-card border-line bg-card border p-4 shadow-sm">
        <h3 className="text-small text-ink font-semibold">
          Volume by Payment Method
        </h3>
        <p className="text-caption text-muted-foreground mb-3">
          Card, bank transfer, cash, and USSD
        </p>
        <div className="space-y-2.5">
          {byMethod.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="text-caption flex justify-between">
                <span className="text-ink font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatNaira(item.amountMinor)} ({item.percent}%)
                </span>
              </div>
              <div className="bg-paper h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. By Provider */}
      <div className="rounded-card border-line bg-card border p-4 shadow-sm">
        <h3 className="text-small text-ink font-semibold">
          Volume by Provider
        </h3>
        <p className="text-caption text-muted-foreground mb-3">
          Paystack vs manual ledger entries
        </p>
        <div className="space-y-2.5">
          {byProvider.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="text-caption flex justify-between">
                <span className="text-ink font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {formatNaira(item.amountMinor)} ({item.percent}%)
                </span>
              </div>
              <div className="bg-paper h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Daily Strip */}
      <div className="rounded-card border-line bg-card border p-4 shadow-sm">
        <h3 className="text-small text-ink font-semibold">
          Recent Daily Collections
        </h3>
        <p className="text-caption text-muted-foreground mb-3">
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
                <div className="bg-ink text-paper absolute -top-8 z-10 hidden rounded px-1.5 py-0.5 text-[0.625rem] whitespace-nowrap shadow group-hover:block">
                  {formatNaira(day.collectedMinor)} ({day.count})
                </div>
                <div className="bg-paper flex h-16 w-full items-end justify-center rounded-t">
                  <div
                    className="bg-primary/80 group-hover:bg-primary w-full max-w-[1.25rem] rounded-t transition-colors"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-muted-foreground truncate text-[0.625rem]">
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

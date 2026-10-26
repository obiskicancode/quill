'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminError, AdminLoading } from '@/components/admin/AdminStates';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type { RevenueData, RevenueRange } from '@/types/dashboard.types';

interface RevenueSummaryProps {
  data: RevenueData | null;
  selectedRange: RevenueRange;
  isLoading: boolean;
  error: string | null;
  onRangeChange: (range: RevenueRange) => void;
  onRetry: () => void;
}

const ranges: { id: RevenueRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
];

function ChangeIndicator({
  percent,
  reverse = false,
}: {
  percent: number;
  reverse?: boolean;
}) {
  const isUp = percent > 0;
  const isZero = percent === 0;

  // For cancellations, up is negative/bad, so reverse = true
  const isPositive = reverse ? !isUp : isUp;

  if (isZero) {
    return (
      <span className="text-caption text-muted inline-flex items-center gap-1 font-semibold">
        <span>0%</span>
        <span>no change vs previous</span>
      </span>
    );
  }

  const Icon = isUp ? TrendingUp : TrendingDown;
  const directionText = isUp ? 'increase' : 'decrease';
  const colorClass = isPositive ? 'text-success' : 'text-danger';

  return (
    <span
      className={`text-caption inline-flex items-center gap-1 font-semibold ${colorClass}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>
        {isUp ? `+${percent}%` : `${percent}%`} {directionText} vs previous
      </span>
    </span>
  );
}

export function RevenueSummary({
  data,
  selectedRange,
  isLoading,
  error,
  onRangeChange,
  onRetry,
}: RevenueSummaryProps) {
  return (
    <Reveal as="section">
      <AdminCard
        title="Revenue summary"
        description="Gross payments minus refunds, bookings and rate metrics for property management."
        footer={
          <div className="text-caption text-muted flex flex-wrap items-center justify-between gap-3">
            <span>All amounts in Nigerian Naira (₦).</span>
            <span>Based on hotel timezone (Africa/Lagos).</span>
          </div>
        }
      >
        {/* Range Selector Controls */}
        <div className="border-line mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
          <span className="text-caption text-muted mr-2 font-semibold tracking-wider uppercase">
            Period:
          </span>
          <div
            role="tablist"
            aria-label="Revenue time periods"
            className="rounded-control bg-paper inline-flex p-1"
          >
            {ranges.map((r) => {
              const active = selectedRange === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onRangeChange(r.id)}
                  className={`rounded-control text-caption min-h-9 px-3 font-semibold transition-all ${
                    active
                      ? 'bg-surface text-ink shadow-raised'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <AdminLoading label="Loading revenue data…" />
        ) : error ? (
          <AdminError
            message={error}
            action={
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Retry revenue
              </Button>
            }
          />
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Payments Received */}
            <div className="rounded-control border-line bg-paper/50 border p-4">
              <span className="text-small text-muted font-medium">
                Payments received
              </span>
              <p className="font-display text-h3 text-ink mt-1 font-semibold">
                {formatNaira(data.current.paymentsReceivedMinor / 100)}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.payments} />
              </div>
            </div>

            {/* 2. New Bookings */}
            <div className="rounded-control border-line bg-paper/50 border p-4">
              <span className="text-small text-muted font-medium">
                New bookings
              </span>
              <p className="font-display text-h3 text-ink mt-1 font-semibold">
                {data.current.newBookings}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.bookings} />
              </div>
            </div>

            {/* 3. Average Nightly Rate */}
            <div className="rounded-control border-line bg-paper/50 border p-4">
              <span className="text-small text-muted font-medium">
                Average nightly rate
              </span>
              <p className="font-display text-h3 text-ink mt-1 font-semibold">
                {formatNaira(data.current.avgNightlyRateMinor / 100)}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.avgRate} />
              </div>
            </div>

            {/* 4. Cancellations */}
            <div className="rounded-control border-line bg-paper/50 border p-4">
              <span className="text-small text-muted font-medium">
                Cancellations
              </span>
              <p className="font-display text-h3 text-ink mt-1 font-semibold">
                {data.current.cancellations}
              </p>
              <div className="mt-2">
                <ChangeIndicator
                  percent={data.changePercent.cancellations}
                  reverse
                />
              </div>
            </div>
          </div>
        ) : null}
      </AdminCard>
    </Reveal>
  );
}

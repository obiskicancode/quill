'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminError, AdminLoading } from '@/components/admin/AdminStates';
import { Reveal } from '@/components/motion/Reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMinor } from '@/lib/format';
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
      <Badge variant="neutral">
        <span>0%</span>
        <span>vs prior</span>
      </Badge>
    );
  }

  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <Badge variant={isPositive ? 'success' : 'destructive'}>
      <Icon aria-hidden="true" />
      <span>{isUp ? `+${percent}%` : `${percent}%`} vs prior</span>
    </Badge>
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-muted-foreground">
            <span>All amounts in Nigerian Naira (₦).</span>
            <span>Based on hotel timezone (Africa/Lagos).</span>
          </div>
        }
      >
        {/* Range Selector Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-4">
          <span className="mr-2 text-caption font-semibold tracking-wider text-muted-foreground uppercase">
            Period:
          </span>
          <div
            role="tablist"
            aria-label="Revenue time periods"
            className="inline-flex rounded-control border border-line bg-paper p-0.5"
          >
            {ranges.map((r) => {
              const active = selectedRange === r.id;
              return (
                <Button
                  key={r.id}
                  type="button"
                  role="tab"
                  variant={active ? 'secondary' : 'ghost'}
                  size="xs"
                  aria-selected={active}
                  onClick={() => onRangeChange(r.id)}
                  className={`h-7 px-2.5 text-caption font-semibold ${
                    active ? 'shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  {r.label}
                </Button>
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
            <div className="rounded-control border border-line bg-paper/50 p-4">
              <span className="text-small font-medium text-muted-foreground">
                Payments received
              </span>
              <p className="mt-1 font-display text-h3 font-semibold text-ink">
                {formatMinor(data.current.paymentsReceivedMinor)}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.payments} />
              </div>
            </div>

            {/* 2. New Bookings */}
            <div className="rounded-control border border-line bg-paper/50 p-4">
              <span className="text-small font-medium text-muted-foreground">
                New bookings
              </span>
              <p className="mt-1 font-display text-h3 font-semibold text-ink">
                {data.current.newBookings}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.bookings} />
              </div>
            </div>

            {/* 3. Average Nightly Rate */}
            <div className="rounded-control border border-line bg-paper/50 p-4">
              <span className="text-small font-medium text-muted-foreground">
                Average nightly rate
              </span>
              <p className="mt-1 font-display text-h3 font-semibold text-ink">
                {formatMinor(data.current.avgNightlyRateMinor)}
              </p>
              <div className="mt-2">
                <ChangeIndicator percent={data.changePercent.avgRate} />
              </div>
            </div>

            {/* 4. Cancellations */}
            <div className="rounded-control border border-line bg-paper/50 p-4">
              <span className="text-small font-medium text-muted-foreground">
                Cancellations
              </span>
              <p className="mt-1 font-display text-h3 font-semibold text-ink">
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

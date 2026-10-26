'use client';

import Link from 'next/link';

import { AdminCard } from '@/components/admin/AdminCard';
import { Reveal } from '@/components/motion/Reveal';
import type { OccupancyDay } from '@/types/dashboard.types';

export function OccupancyStrip({ days }: { days: OccupancyDay[] }) {
  const formatDateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('en-NG', {
      weekday: 'short',
      day: 'numeric',
    }).format(dateObj);
  };

  const getBarColor = (percent: number) => {
    if (percent >= 85) return 'bg-danger text-white';
    if (percent >= 60) return 'bg-accent text-ink';
    if (percent > 0) return 'bg-success text-white';
    return 'bg-line/60 text-muted';
  };

  return (
    <Reveal as="section">
      <AdminCard
        title="Next 14 days occupancy"
        description="Daily occupancy percentage and scheduled movements. Click any day to view in calendar."
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[36rem] items-end justify-between gap-2 pt-6">
            {days.map((day) => {
              const tooltip = `${formatDateLabel(day.date)}: ${day.occupancyPercent}% (${day.occupied} of ${day.sellable} rooms). Arrivals: ${day.arrivals}, Departures: ${day.departures}.`;
              const barHeight = Math.max(
                12,
                Math.round((day.occupancyPercent / 100) * 120),
              );

              return (
                <Link
                  key={day.date}
                  href={`/admin/calendar?date=${day.date}`}
                  title={tooltip}
                  aria-label={tooltip}
                  className="group relative flex flex-1 flex-col items-center focus:outline-none"
                >
                  {/* Tooltip on hover */}
                  <div className="rounded-control bg-ink text-caption text-paper shadow-float pointer-events-none absolute -top-12 z-20 hidden -translate-x-1/2 px-2.5 py-1 font-semibold whitespace-nowrap group-hover:block group-focus-visible:block">
                    <p>
                      {day.occupancyPercent}% ({day.occupied}/{day.sellable})
                    </p>
                    <p className="text-[10px] text-white/70">
                      ↓{day.arrivals} ↑{day.departures}
                    </p>
                  </div>

                  {/* Percentage label above bar */}
                  <span className="text-muted group-hover:text-ink mb-1 text-[11px] font-semibold">
                    {day.occupancyPercent}%
                  </span>

                  {/* The bar track */}
                  <div className="rounded-t-control bg-paper flex h-32 w-full max-w-[2.25rem] flex-col justify-end p-0.5">
                    <div
                      style={{ height: `${barHeight}px` }}
                      className={`rounded-t-control w-full transition-all duration-200 group-hover:brightness-95 ${getBarColor(day.occupancyPercent)}`}
                    />
                  </div>

                  {/* Date label */}
                  <span className="text-caption text-muted group-hover:text-ink mt-2 text-center font-medium">
                    {formatDateLabel(day.date)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </AdminCard>
    </Reveal>
  );
}

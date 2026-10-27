'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { Reveal } from '@/components/motion/Reveal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    if (percent >= 85) return 'bg-destructive text-white';
    if (percent >= 60) return 'bg-primary text-ink';
    if (percent > 0) return 'bg-success text-white';
    return 'bg-line/60 text-muted-foreground';
  };

  return (
    <Reveal as="section">
      <AdminCard
        title="Next 14 days occupancy"
        description="Daily occupancy percentage and scheduled movements. Click any day to view in calendar."
        footer={
          <div className="text-caption text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ink font-semibold">Thresholds:</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-success size-2.5 rounded-full" />
                <span>&lt; 60% Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-primary size-2.5 rounded-full" />
                <span>60%–84% High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-destructive size-2.5 rounded-full" />
                <span>≥ 85% Critical</span>
              </div>
            </div>

            <Link
              href="/admin/calendar"
              className="text-brand inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <span>Full calendar</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      >
        <TooltipProvider delay={100}>
          <div className="overflow-x-auto pb-2">
            <div className="relative flex min-w-[36rem] items-end justify-between gap-2 pt-6">
              {/* Baseline reference lines */}
              <div className="border-line pointer-events-none absolute inset-x-0 bottom-8 h-32 border-b">
                <div className="border-line/40 absolute inset-x-0 top-0 border-b border-dashed" />
                <div className="border-line/30 absolute inset-x-0 top-1/2 border-b border-dashed" />
              </div>

              {days.map((day, idx) => {
                const isToday = idx === 0;
                const barHeight = Math.max(
                  12,
                  Math.round((day.occupancyPercent / 100) * 120),
                );

                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger
                      render={
                        <Link
                          href={`/admin/calendar?date=${day.date}`}
                          className="group relative z-10 flex flex-1 flex-col items-center focus:outline-none"
                        />
                      }
                    >
                      {/* Percentage label above bar */}
                      <span className="text-muted-foreground group-hover:text-ink mb-1 text-[0.6875rem] font-semibold">
                        {day.occupancyPercent}%
                      </span>

                      {/* The bar track */}
                      <div className="rounded-t-control bg-paper/80 flex h-32 w-full max-w-[2.25rem] flex-col justify-end p-0.5">
                        <div
                          style={{ height: `${barHeight}px` }}
                          className={`rounded-t-control w-full transition-all duration-200 group-hover:brightness-95 ${getBarColor(day.occupancyPercent)}`}
                        />
                      </div>

                      {/* Date label */}
                      <div className="mt-2 flex flex-col items-center">
                        <span className="text-caption text-muted-foreground group-hover:text-ink text-center font-medium">
                          {formatDateLabel(day.date)}
                        </span>
                        {isToday && (
                          <span className="bg-primary/20 py-0.2 text-brand-ink mt-0.5 rounded-full px-1.5 text-[0.5625rem] font-bold">
                            Today
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>

                    <TooltipContent
                      side="top"
                      className="text-center font-sans"
                    >
                      <p className="text-paper font-semibold">
                        {formatDateLabel(day.date)}: {day.occupancyPercent}%
                      </p>
                      <p className="text-[0.6875rem] text-white/80">
                        {day.occupied} of {day.sellable} rooms occupied
                      </p>
                      <p className="text-primary mt-0.5 text-[0.625rem]">
                        ↓ {day.arrivals} arrivals • ↑ {day.departures}{' '}
                        departures
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
      </AdminCard>
    </Reveal>
  );
}

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { FOCUS_RING } from '@/components/admin/clickableRow';
import { Reveal } from '@/components/motion/Reveal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatWeekdayDay } from '@/lib/dates';
import type { OccupancyDay } from '@/types/dashboard.types';

export function OccupancyStrip({ days }: { days: OccupancyDay[] }) {
  const getBarColor = (percent: number) => {
    if (percent >= 85) return 'bg-destructive text-destructive-foreground';
    if (percent >= 60) return 'bg-primary text-primary-foreground';
    if (percent > 0) return 'bg-success text-success-foreground';
    return 'bg-line/60 text-muted-foreground';
  };

  return (
    <Reveal as="section">
      <AdminCard
        title="Next 14 days occupancy"
        description="Daily occupancy percentage and scheduled movements. Click any day to view in calendar."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-muted-foreground">
            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-ink">Thresholds:</span>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-success" />
                <span>&lt; 60% Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" />
                <span>60%–84% High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-destructive" />
                <span>≥ 85% Critical</span>
              </div>
            </div>

            <Link
              href="/admin/calendar"
              className="inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"
            >
              <span>Full calendar</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      >
        <TooltipProvider delay={100}>
          <div className="overflow-x-auto pb-2">
            <div className="relative flex min-w-144 items-end justify-between gap-2 pt-6">
              {/* Baseline reference lines */}
              <div className="pointer-events-none absolute inset-x-0 bottom-8 h-32 border-b border-line">
                <div className="absolute inset-x-0 top-0 border-b border-dashed border-line/40" />
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-line/30" />
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
                          className={`group relative z-10 flex flex-1 flex-col items-center ${FOCUS_RING}`}
                        />
                      }
                    >
                      {/* Percentage label above bar */}
                      <span className="mb-1 text-micro font-semibold text-muted-foreground group-hover:text-ink">
                        {day.occupancyPercent}%
                      </span>

                      {/* The bar track */}
                      <div className="flex h-32 w-full max-w-9 flex-col justify-end rounded-t-control bg-paper/80 p-0.5">
                        <div
                          style={{ height: `${barHeight}px` }}
                          className={`w-full rounded-t-control transition-all duration-200 group-hover:brightness-95 ${getBarColor(day.occupancyPercent)}`}
                        />
                      </div>

                      {/* Date label */}
                      <div className="mt-2 flex flex-col items-center">
                        <span className="text-center text-caption font-medium text-muted-foreground group-hover:text-ink">
                          {formatWeekdayDay(day.date)}
                        </span>
                        {isToday && (
                          <span className="py-0.2 mt-0.5 rounded-full bg-primary/20 px-1.5 text-micro font-bold text-brand-ink">
                            Today
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>

                    <TooltipContent
                      side="top"
                      className="text-center font-sans"
                    >
                      <p className="font-semibold text-paper">
                        {formatWeekdayDay(day.date)}: {day.occupancyPercent}%
                      </p>
                      <p className="text-micro text-white/80">
                        {day.occupied} of {day.sellable} rooms occupied
                      </p>
                      <p className="mt-0.5 text-micro text-brand-ink">
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

'use client';

import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CalendarNightStat } from '@/types/calendar.types';

interface CalendarSummaryRowProps {
  stats: CalendarNightStat[];
  today: string;
  onSelectDate: (date: string) => void;
}

export function CalendarSummaryRow({
  stats,
  today,
  onSelectDate,
}: CalendarSummaryRowProps) {
  return (
    <div className="flex border-b border-line bg-muted/70 font-mono text-caption">
      {/* Sticky Room Column Header Label */}
      <div className="sticky left-0 z-20 flex w-52 shrink-0 flex-col justify-center border-r border-line bg-paper px-3 py-1.5 shadow-xs">
        <span className="font-sans font-semibold text-ink">Occupancy</span>
        <span className="font-sans text-micro text-muted-foreground">
          Arrivals & Departures
        </span>
      </div>

      {/* Date columns */}
      <div className="flex">
        {stats.map((stat) => {
          const isToday = stat.date === today;
          return (
            <Button
              key={stat.date}
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onSelectDate(stat.date)}
              title={`${stat.date}: ${stat.occupancyPercent}% occupancy (${stat.occupiedRooms} of ${stat.sellableRooms} sellable). ${stat.arrivalsCount} arrivals, ${stat.departuresCount} departures. Click for details.`}
              aria-label={`Occupancy for ${stat.date}: ${stat.occupancyPercent} percent, ${stat.occupiedRooms} of ${stat.sellableRooms} sellable, ${stat.arrivalsCount} arrivals, ${stat.departuresCount} departures`}
              className={`h-auto w-24 shrink-0 flex-col rounded-none border-r border-line/60 p-1 font-mono ${
                isToday ? 'bg-primary/10' : ''
              }`}
            >
              {/* Percentage & count */}
              <div className="flex items-center gap-1">
                <span
                  className={`font-semibold ${
                    stat.occupancyPercent >= 90
                      ? 'text-destructive'
                      : stat.occupancyPercent >= 70
                        ? 'text-brand-ink'
                        : 'text-ink'
                  }`}
                >
                  {stat.occupancyPercent}%
                </span>
                <span className="text-micro text-muted-foreground">
                  ({stat.occupiedRooms}/{stat.sellableRooms})
                </span>
              </div>

              {/* Arrivals and Departures */}
              <div className="mt-0.5 flex items-center gap-2 text-micro">
                {stat.arrivalsCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-success">
                    <ArrowDownToLine className="size-3" aria-hidden />
                    {stat.arrivalsCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">-</span>
                )}
                {stat.departuresCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-departures">
                    <ArrowUpFromLine className="size-3" aria-hidden />
                    {stat.departuresCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">-</span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

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
    <div className="bg-muted/70 border-line text-caption flex border-b font-mono">
      {/* Sticky Room Column Header Label */}
      <div className="border-line bg-paper sticky left-0 z-20 flex w-48 shrink-0 flex-col justify-center border-r px-3 py-1.5 shadow-xs">
        <span className="text-ink font-sans font-semibold">Occupancy</span>
        <span className="text-muted-foreground font-sans text-[11px]">
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
              aria-label={`Occupancy for ${stat.date}: ${stat.occupancyPercent} percent`}
              className={`border-line/60 h-auto w-24 shrink-0 flex-col rounded-none border-r p-1 font-mono ${
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
                <span className="text-muted-foreground text-[10px]">
                  ({stat.occupiedRooms}/{stat.sellableRooms})
                </span>
              </div>

              {/* Arrivals and Departures */}
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                {stat.arrivalsCount > 0 ? (
                  <span
                    className="text-success"
                    title={`${stat.arrivalsCount} arrivals`}
                  >
                    ↓{stat.arrivalsCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">-</span>
                )}
                {stat.departuresCount > 0 ? (
                  <span
                    className="text-blue-700 dark:text-blue-400"
                    title={`${stat.departuresCount} departures`}
                  >
                    ↑{stat.departuresCount}
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

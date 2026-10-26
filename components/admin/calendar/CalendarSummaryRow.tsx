'use client';

import React from 'react';

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
    <div className="bg-canvas/70 border-line text-caption flex border-b font-mono">
      {/* Sticky Room Column Header Label */}
      <div className="border-line bg-paper sticky left-0 z-20 flex w-48 shrink-0 flex-col justify-center border-r px-3 py-1.5 shadow-xs">
        <span className="text-ink font-sans font-semibold">Occupancy</span>
        <span className="text-muted font-sans text-[11px]">
          Arrivals & Departures
        </span>
      </div>

      {/* Date columns */}
      <div className="flex">
        {stats.map((stat) => {
          const isToday = stat.date === today;
          return (
            <button
              key={stat.date}
              type="button"
              onClick={() => onSelectDate(stat.date)}
              title={`${stat.date}: ${stat.occupancyPercent}% occupancy (${stat.occupiedRooms} of ${stat.sellableRooms} sellable). ${stat.arrivalsCount} arrivals, ${stat.departuresCount} departures. Click for details.`}
              aria-label={`Occupancy for ${stat.date}: ${stat.occupancyPercent} percent`}
              className={`border-line/60 hover:bg-paper flex w-24 shrink-0 flex-col items-center justify-center border-r px-1 py-1 transition-colors focus:outline-hidden ${
                isToday ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
              }`}
            >
              {/* Percentage & count */}
              <div className="flex items-center gap-1">
                <span
                  className={`font-semibold ${
                    stat.occupancyPercent >= 90
                      ? 'text-danger'
                      : stat.occupancyPercent >= 70
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-ink'
                  }`}
                >
                  {stat.occupancyPercent}%
                </span>
                <span className="text-muted text-[10px]">
                  ({stat.occupiedRooms}/{stat.sellableRooms})
                </span>
              </div>

              {/* Arrivals and Departures */}
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                {stat.arrivalsCount > 0 ? (
                  <span
                    className="text-emerald-700 dark:text-emerald-400"
                    title={`${stat.arrivalsCount} arrivals`}
                  >
                    ↓{stat.arrivalsCount}
                  </span>
                ) : (
                  <span className="text-muted/50">-</span>
                )}
                {stat.departuresCount > 0 ? (
                  <span
                    className="text-blue-700 dark:text-blue-400"
                    title={`${stat.departuresCount} departures`}
                  >
                    ↑{stat.departuresCount}
                  </span>
                ) : (
                  <span className="text-muted/50">-</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import React, { useState } from 'react';

import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { formatLong, formatShort } from '@/lib/dates';
import type { CalendarResponse } from '@/types/calendar.types';
import type { ReservationStatus } from '@/types/dashboard.types';

interface CalendarAgendaViewProps {
  data: CalendarResponse;
  today: string;
  onSelectDate: (date: string) => void;
}

export function CalendarAgendaView({
  data,
  today,
  onSelectDate,
}: CalendarAgendaViewProps) {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({
    [today]: true,
  });

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  return (
    <div className="space-y-3">
      {data.stats.map((stat) => {
        const isToday = stat.date === today;
        const isExpanded = !!expandedDates[stat.date];

        // Filter arrivals and departures for this date
        const dayArrivals = data.reservations.filter(
          (r) => !r.isStaleHold && r.checkIn === stat.date,
        );
        const dayDepartures = data.reservations.filter(
          (r) => !r.isStaleHold && r.checkOut === stat.date,
        );
        const dayBlocks = data.blocks.filter(
          (b) => b.startDate <= stat.date && b.endDate > stat.date,
        );

        return (
          <div
            key={stat.date}
            className={`rounded-card border transition-colors ${
              isToday
                ? 'border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-line bg-paper'
            }`}
          >
            {/* Header Button (Touch target >= 44px) */}
            <button
              type="button"
              onClick={() => toggleDate(stat.date)}
              className="hover:bg-canvas/40 flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-left transition-colors focus:outline-hidden"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-3">
                <div className="text-muted">
                  {isExpanded ? (
                    <ChevronDown className="size-5" />
                  ) : (
                    <ChevronRight className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-small text-ink font-serif font-semibold">
                      {formatLong(stat.date)}
                    </span>
                    {isToday && (
                      <span className="rounded-control bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="text-caption text-muted mt-0.5 flex flex-wrap items-center gap-2">
                    <span>
                      {stat.occupancyPercent}% occupancy ({stat.occupiedRooms}/
                      {stat.sellableRooms})
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ↓ {stat.arrivalsCount} arrivals
                    </span>
                    <span>•</span>
                    <span className="text-blue-700 dark:text-blue-400">
                      ↑ {stat.departuresCount} departures
                    </span>
                  </div>
                </div>
              </div>

              {/* Units Free by Room Type */}
              <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
                {data.roomTypes.map((rt) => {
                  const free = stat.freeByType[rt.id]?.free ?? 0;
                  const total = stat.freeByType[rt.id]?.total ?? 0;
                  return (
                    <span
                      key={rt.id}
                      className={`rounded-control border px-2 py-0.5 text-[11px] font-medium ${
                        free > 0
                          ? 'bg-canvas border-line text-ink'
                          : 'border-danger/30 bg-danger/10 text-danger'
                      }`}
                    >
                      {rt.name}: {free}/{total}
                    </span>
                  );
                })}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-line/60 space-y-4 border-t p-4">
                {/* Free summary on mobile */}
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {data.roomTypes.map((rt) => {
                    const free = stat.freeByType[rt.id]?.free ?? 0;
                    const total = stat.freeByType[rt.id]?.total ?? 0;
                    return (
                      <span
                        key={rt.id}
                        className="bg-canvas rounded-control border-line text-muted border px-2 py-0.5 text-[11px]"
                      >
                        {rt.name}:{' '}
                        <strong className="text-ink">
                          {free}/{total} free
                        </strong>
                      </span>
                    );
                  })}
                </div>

                {/* Day arrivals list */}
                <div>
                  <h4 className="text-caption text-muted mb-2 flex items-center gap-1.5 font-semibold tracking-wider uppercase">
                    <ArrowDownLeft className="size-3.5 text-emerald-600" />
                    Arrivals ({dayArrivals.length})
                  </h4>
                  {dayArrivals.length === 0 ? (
                    <p className="text-caption text-muted italic">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayArrivals.map((res) => {
                        const room = data.rooms.find(
                          (r) => r.id === res.roomId,
                        );
                        return (
                          <Link
                            key={res.id}
                            href={`/admin/reservations/${res.id}`}
                            className="bg-canvas/40 hover:bg-canvas rounded-control border-line text-small flex items-center justify-between border px-3 py-2 transition-colors focus:outline-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-caption text-muted font-mono">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="text-ink font-medium">
                                {res.guestName}
                              </span>
                              <span className="text-caption text-muted font-mono">
                                ({res.reference})
                              </span>
                            </div>
                            <StatusBadge
                              status={res.status as ReservationStatus}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Day departures list */}
                <div>
                  <h4 className="text-caption text-muted mb-2 flex items-center gap-1.5 font-semibold tracking-wider uppercase">
                    <ArrowUpRight className="size-3.5 text-blue-600" />
                    Departures ({dayDepartures.length})
                  </h4>
                  {dayDepartures.length === 0 ? (
                    <p className="text-caption text-muted italic">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayDepartures.map((res) => {
                        const room = data.rooms.find(
                          (r) => r.id === res.roomId,
                        );
                        return (
                          <Link
                            key={res.id}
                            href={`/admin/reservations/${res.id}`}
                            className="bg-canvas/40 hover:bg-canvas rounded-control border-line text-small flex items-center justify-between border px-3 py-2 transition-colors focus:outline-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-caption text-muted font-mono">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="text-ink font-medium">
                                {res.guestName}
                              </span>
                              <span className="text-caption text-muted font-mono">
                                ({res.reference})
                              </span>
                            </div>
                            <StatusBadge
                              status={res.status as ReservationStatus}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Day blocks list */}
                {dayBlocks.length > 0 && (
                  <div>
                    <h4 className="text-caption text-muted mb-2 flex items-center gap-1.5 font-semibold tracking-wider uppercase">
                      <ShieldAlert className="text-danger size-3.5" />
                      Active Room Blocks ({dayBlocks.length})
                    </h4>
                    <div className="space-y-1.5">
                      {dayBlocks.map((b) => {
                        const room = data.rooms.find((r) => r.id === b.roomId);
                        return (
                          <div
                            key={b.id}
                            className="bg-canvas/40 rounded-control border-line text-small flex items-center justify-between border px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-caption text-muted font-mono">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="text-ink font-medium capitalize">
                                {b.reason.replace('_', ' ')}
                              </span>
                              {b.notes && (
                                <span className="text-caption text-muted">
                                  - {b.notes}
                                </span>
                              )}
                            </div>
                            <span className="text-muted font-mono text-[11px]">
                              {formatShort(b.startDate)} →{' '}
                              {formatShort(b.endDate)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Full day breakdown link */}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectDate(stat.date)}
                    className="text-caption text-ink font-medium underline underline-offset-2 hover:opacity-80 focus:outline-hidden"
                  >
                    Open Full Day Breakdown →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

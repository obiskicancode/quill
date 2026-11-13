'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';

import {
  AdminStatusBadge,
  reservationTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Button } from '@/components/ui/button';
import { formatLong, formatShort } from '@/lib/dates';
import type { CalendarResponse } from '@/types/calendar.types';

interface CalendarAgendaViewProps {
  data: CalendarResponse;
  today: string;
  onSelectDate: (date: string) => void;
}

/** Mobile-friendly agenda grouping of arrivals, departures and blocks by day. */
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
                ? 'border-primary/40 bg-primary/10'
                : 'border-line bg-paper'
            }`}
          >
            {/* Header Button (Touch target >= 44px) */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => toggleDate(stat.date)}
              className="h-auto w-full justify-between px-4 py-3 text-left font-normal"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="size-5" />
                  ) : (
                    <ChevronRight className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-small font-semibold text-ink">
                      {formatLong(stat.date)}
                    </span>
                    {isToday && (
                      <span className="rounded-control bg-primary/20 px-1.5 py-0.5 text-micro font-bold text-brand-ink">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                    <span>
                      {stat.occupancyPercent}% occupancy ({stat.occupiedRooms}/
                      {stat.sellableRooms})
                    </span>
                    <span>•</span>
                    <span className="text-success">
                      ↓ {stat.arrivalsCount} arrivals
                    </span>
                    <span>•</span>
                    <span className="text-departures">
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
                      className={`rounded-control border px-2 py-0.5 text-micro font-medium ${
                        free > 0
                          ? 'border-line bg-muted text-ink'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }`}
                    >
                      {rt.name}: {free}/{total}
                    </span>
                  );
                })}
              </div>
            </Button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="space-y-4 border-t border-line/60 p-4">
                {/* Free summary on mobile */}
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {data.roomTypes.map((rt) => {
                    const free = stat.freeByType[rt.id]?.free ?? 0;
                    const total = stat.freeByType[rt.id]?.total ?? 0;
                    return (
                      <span
                        key={rt.id}
                        className="rounded-control border border-line bg-muted px-2 py-0.5 text-micro text-muted-foreground"
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
                  <h4 className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wider text-muted-foreground uppercase">
                    <ArrowDownLeft className="size-3.5 text-success" />
                    Arrivals ({dayArrivals.length})
                  </h4>
                  {dayArrivals.length === 0 ? (
                    <p className="text-caption text-muted-foreground italic">
                      None
                    </p>
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
                            className="flex items-center justify-between rounded-control border border-line bg-muted/40 px-3 py-2 text-small transition-colors hover:bg-muted focus:outline-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-caption text-muted-foreground">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="font-medium text-ink">
                                {res.guestName}
                              </span>
                              <span className="font-mono text-caption text-muted-foreground">
                                ({res.reference})
                              </span>
                            </div>
                            <AdminStatusBadge
                              tone={reservationTone(res.status)}
                            >
                              {statusLabel(res.status)}
                            </AdminStatusBadge>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Day departures list */}
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wider text-muted-foreground uppercase">
                    <ArrowUpRight className="size-3.5 text-departures" />
                    Departures ({dayDepartures.length})
                  </h4>
                  {dayDepartures.length === 0 ? (
                    <p className="text-caption text-muted-foreground italic">
                      None
                    </p>
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
                            className="flex items-center justify-between rounded-control border border-line bg-muted/40 px-3 py-2 text-small transition-colors hover:bg-muted focus:outline-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-caption text-muted-foreground">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="font-medium text-ink">
                                {res.guestName}
                              </span>
                              <span className="font-mono text-caption text-muted-foreground">
                                ({res.reference})
                              </span>
                            </div>
                            <AdminStatusBadge
                              tone={reservationTone(res.status)}
                            >
                              {statusLabel(res.status)}
                            </AdminStatusBadge>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Day blocks list */}
                {dayBlocks.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wider text-muted-foreground uppercase">
                      <ShieldAlert className="size-3.5 text-destructive" />
                      Active Room Blocks ({dayBlocks.length})
                    </h4>
                    <div className="space-y-1.5">
                      {dayBlocks.map((b) => {
                        const room = data.rooms.find((r) => r.id === b.roomId);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between rounded-control border border-line bg-muted/40 px-3 py-2 text-small"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-caption text-muted-foreground">
                                #{room?.roomNumber ?? '??'}
                              </span>
                              <span className="font-medium text-ink capitalize">
                                {b.reason.replace('_', ' ')}
                              </span>
                              {b.notes && (
                                <span className="text-caption text-muted-foreground">
                                  - {b.notes}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-micro text-muted-foreground">
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
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => onSelectDate(stat.date)}
                    className="h-auto p-0 text-caption font-medium text-ink"
                  >
                    Open Full Day Breakdown →
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

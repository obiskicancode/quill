'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BedDouble,
  Loader2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { formatLong, formatShort } from '@/lib/dates';
import type { CalendarDayResponse } from '@/types/calendar.types';
import type { ReservationStatus } from '@/types/dashboard.types';

interface CalendarDayPanelProps {
  date: string | null;
  onClose: () => void;
}

export function CalendarDayPanel({ date, onClose }: CalendarDayPanelProps) {
  const [data, setData] = useState<CalendarDayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;

    let active = true;
    const fetchDay = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminService.getCalendarDay(date);
        if (active) {
          setData(res.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Failed to load day details.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDay();
    return () => {
      active = false;
    };
  }, [date]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!date) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${date}`}
      className="bg-ink/40 fixed inset-0 z-50 flex justify-end backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-paper flex h-full w-full max-w-lg flex-col shadow-2xl transition-transform duration-200">
        {/* Header */}
        <div className="border-line flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-h3 text-ink font-serif font-semibold">
              {formatLong(date)}
            </h2>
            <p className="text-caption text-muted">
              Daily Front Desk Breakdown
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="hover:bg-canvas rounded-control text-muted hover:text-ink p-1.5 transition-colors focus:outline-hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="text-muted size-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-control border-danger/30 bg-danger/10 text-small text-danger border p-4">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Free Rooms by Room Type */}
              <section>
                <div className="mb-2.5 flex items-center gap-2">
                  <BedDouble className="text-muted size-4" />
                  <h3 className="text-small text-ink font-semibold tracking-wider uppercase">
                    Available Units by Type
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.freeRoomsByType.map((type) => (
                    <div
                      key={type.roomTypeId}
                      className="bg-canvas/40 rounded-control border-line border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-small text-ink font-medium">
                          {type.roomTypeName}
                        </span>
                        <span
                          className={`text-caption font-semibold ${
                            type.freeCount > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-danger'
                          }`}
                        >
                          {type.freeCount} of {type.totalCount} free
                        </span>
                      </div>
                      {type.availableRooms.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {type.availableRooms.map((r) => (
                            <span
                              key={r.id}
                              className="rounded-control border-line bg-paper text-muted border px-1.5 py-0.5 font-mono text-[11px]"
                            >
                              #{r.roomNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted mt-1 text-[11px] italic">
                          Sold out for this night
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Arrivals */}
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="size-4 text-emerald-600" />
                    <h3 className="text-small text-ink font-semibold tracking-wider uppercase">
                      Arrivals ({data.arrivals.length})
                    </h3>
                  </div>
                </div>
                {data.arrivals.length === 0 ? (
                  <p className="text-caption text-muted italic">
                    No arrivals scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.arrivals.map((arr) => (
                      <Link
                        key={arr.id}
                        href={`/admin/reservations/${arr.id}`}
                        className="hover:bg-canvas/50 rounded-control border-line bg-paper flex items-center justify-between border p-3 transition-colors focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small text-ink font-medium">
                              {arr.guestName}
                            </span>
                            <span className="bg-canvas py-0.2 rounded-control text-muted px-1.5 font-mono text-[11px]">
                              #{arr.roomNumber}
                            </span>
                          </div>
                          <p className="text-caption text-muted font-mono">
                            {arr.reference} • Out on {formatShort(arr.checkOut)}
                          </p>
                        </div>
                        <StatusBadge status={arr.status as ReservationStatus} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Departures */}
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-blue-600" />
                    <h3 className="text-small text-ink font-semibold tracking-wider uppercase">
                      Departures ({data.departures.length})
                    </h3>
                  </div>
                </div>
                {data.departures.length === 0 ? (
                  <p className="text-caption text-muted italic">
                    No departures scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.departures.map((dep) => (
                      <Link
                        key={dep.id}
                        href={`/admin/reservations/${dep.id}`}
                        className="hover:bg-canvas/50 rounded-control border-line bg-paper flex items-center justify-between border p-3 transition-colors focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small text-ink font-medium">
                              {dep.guestName}
                            </span>
                            <span className="bg-canvas py-0.2 rounded-control text-muted px-1.5 font-mono text-[11px]">
                              #{dep.roomNumber}
                            </span>
                          </div>
                          <p className="text-caption text-muted font-mono">
                            {dep.reference} • In since{' '}
                            {formatShort(dep.checkIn)}
                          </p>
                        </div>
                        <StatusBadge status={dep.status as ReservationStatus} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* In-House Guests */}
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-amber-600" />
                    <h3 className="text-small text-ink font-semibold tracking-wider uppercase">
                      Staying Over ({data.inHouse.length})
                    </h3>
                  </div>
                </div>
                {data.inHouse.length === 0 ? (
                  <p className="text-caption text-muted italic">
                    No staying-over guests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.inHouse.map((stay) => (
                      <Link
                        key={stay.id}
                        href={`/admin/reservations/${stay.id}`}
                        className="hover:bg-canvas/50 rounded-control border-line bg-paper flex items-center justify-between border p-3 transition-colors focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small text-ink font-medium">
                              {stay.guestName}
                            </span>
                            <span className="bg-canvas py-0.2 rounded-control text-muted px-1.5 font-mono text-[11px]">
                              #{stay.roomNumber}
                            </span>
                          </div>
                          <p className="text-caption text-muted font-mono">
                            {stay.reference} • Departs{' '}
                            {formatShort(stay.checkOut)}
                          </p>
                        </div>
                        <StatusBadge
                          status={stay.status as ReservationStatus}
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Active Blocks */}
              {data.blocks.length > 0 && (
                <section>
                  <div className="mb-2.5 flex items-center gap-2">
                    <ShieldAlert className="text-danger size-4" />
                    <h3 className="text-small text-ink font-semibold tracking-wider uppercase">
                      Active Blocks ({data.blocks.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {data.blocks.map((b) => (
                      <div
                        key={b.id}
                        className="bg-canvas/30 rounded-control border-line border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-small text-ink font-medium">
                            Room #{b.roomNumber} ({b.roomTypeName})
                          </span>
                          <span className="rounded-control bg-danger/10 text-danger px-2 py-0.5 font-mono text-[11px] font-semibold uppercase">
                            {b.reason.replace('_', ' ')}
                          </span>
                        </div>
                        {b.notes && (
                          <p className="text-caption text-muted mt-1">
                            {b.notes}
                          </p>
                        )}
                        <p className="text-muted mt-1 font-mono text-[11px]">
                          {formatShort(b.startDate)} → {formatShort(b.endDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

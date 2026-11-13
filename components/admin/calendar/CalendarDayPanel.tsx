'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BedDouble,
  Loader2,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  AdminStatusBadge,
  reservationTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Alert } from '@/components/ui/alert';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useCalendarDay } from '@/hooks/services/admin/use-calendar';
import { formatLong, formatShort } from '@/lib/dates';

interface CalendarDayPanelProps {
  date: string | null;
  onClose: () => void;
}

/** Day detail panel with arrivals, departures, in-house guests and free rooms. */
export function CalendarDayPanel({ date, onClose }: CalendarDayPanelProps) {
  const dayQuery = useCalendarDay(date);
  const data = dayQuery.data ?? null;
  const loading = Boolean(date) && dayQuery.isPending && !dayQuery.data;
  const error = dayQuery.error
    ? dayQuery.error instanceof Error
      ? dayQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_LOAD_DAY_DETAILS
    : null;

  if (!date) return null;

  return (
    <Sheet
      open={Boolean(date)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" size="lg" surface="paper">
        <SheetHeader>
          <SheetTitle>{formatLong(date)}</SheetTitle>
          <SheetDescription className="text-caption">
            Daily Front Desk Breakdown
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <SheetBody className="space-y-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive" size="panel">
              {error}
            </Alert>
          ) : data ? (
            <>
              {/* Free Rooms by Room Type */}
              <section>
                <div className="mb-2.5 flex items-center gap-2">
                  <BedDouble className="size-4 text-muted-foreground" />
                  <h3 className="text-small font-semibold tracking-wider text-ink uppercase">
                    Available Units by Type
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {data.freeRoomsByType.map((type) => (
                    <div
                      key={type.roomTypeId}
                      className="rounded-control border border-line bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-small font-medium text-ink">
                          {type.roomTypeName}
                        </span>
                        <span
                          className={`text-caption font-semibold ${
                            type.freeCount > 0
                              ? 'text-success'
                              : 'text-destructive'
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
                              className="rounded-control border border-line bg-paper px-1.5 py-0.5 font-mono text-micro text-muted-foreground"
                            >
                              #{r.roomNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-micro text-muted-foreground italic">
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
                    <ArrowDownLeft className="size-4 text-success" />
                    <h3 className="text-small font-semibold tracking-wider text-ink uppercase">
                      Arrivals ({data.arrivals.length})
                    </h3>
                  </div>
                </div>
                {data.arrivals.length === 0 ? (
                  <p className="text-caption text-muted-foreground italic">
                    No arrivals scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.arrivals.map((arr) => (
                      <Link
                        key={arr.id}
                        href={`/admin/reservations/${arr.id}`}
                        className="flex items-center justify-between rounded-control border border-line bg-paper p-3 transition-colors hover:bg-muted/50 focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-ink">
                              {arr.guestName}
                            </span>
                            <span className="py-0.2 rounded-control bg-muted px-1.5 font-mono text-micro text-muted-foreground">
                              #{arr.roomNumber}
                            </span>
                          </div>
                          <p className="font-mono text-caption text-muted-foreground">
                            {arr.reference} • Out on {formatShort(arr.checkOut)}
                          </p>
                        </div>
                        <AdminStatusBadge tone={reservationTone(arr.status)}>
                          {statusLabel(arr.status)}
                        </AdminStatusBadge>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Departures */}
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-departures" />
                    <h3 className="text-small font-semibold tracking-wider text-ink uppercase">
                      Departures ({data.departures.length})
                    </h3>
                  </div>
                </div>
                {data.departures.length === 0 ? (
                  <p className="text-caption text-muted-foreground italic">
                    No departures scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.departures.map((dep) => (
                      <Link
                        key={dep.id}
                        href={`/admin/reservations/${dep.id}`}
                        className="flex items-center justify-between rounded-control border border-line bg-paper p-3 transition-colors hover:bg-muted/50 focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-ink">
                              {dep.guestName}
                            </span>
                            <span className="py-0.2 rounded-control bg-muted px-1.5 font-mono text-micro text-muted-foreground">
                              #{dep.roomNumber}
                            </span>
                          </div>
                          <p className="font-mono text-caption text-muted-foreground">
                            {dep.reference} • In since{' '}
                            {formatShort(dep.checkIn)}
                          </p>
                        </div>
                        <AdminStatusBadge tone={reservationTone(dep.status)}>
                          {statusLabel(dep.status)}
                        </AdminStatusBadge>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* In-House Guests */}
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-brand-ink" />
                    <h3 className="text-small font-semibold tracking-wider text-ink uppercase">
                      Staying Over ({data.inHouse.length})
                    </h3>
                  </div>
                </div>
                {data.inHouse.length === 0 ? (
                  <p className="text-caption text-muted-foreground italic">
                    No staying-over guests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.inHouse.map((stay) => (
                      <Link
                        key={stay.id}
                        href={`/admin/reservations/${stay.id}`}
                        className="flex items-center justify-between rounded-control border border-line bg-paper p-3 transition-colors hover:bg-muted/50 focus:outline-hidden"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-ink">
                              {stay.guestName}
                            </span>
                            <span className="py-0.2 rounded-control bg-muted px-1.5 font-mono text-micro text-muted-foreground">
                              #{stay.roomNumber}
                            </span>
                          </div>
                          <p className="font-mono text-caption text-muted-foreground">
                            {stay.reference} • Departs{' '}
                            {formatShort(stay.checkOut)}
                          </p>
                        </div>
                        <AdminStatusBadge tone={reservationTone(stay.status)}>
                          {statusLabel(stay.status)}
                        </AdminStatusBadge>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Active Blocks */}
              {data.blocks.length > 0 && (
                <section>
                  <div className="mb-2.5 flex items-center gap-2">
                    <ShieldAlert className="size-4 text-destructive" />
                    <h3 className="text-small font-semibold tracking-wider text-ink uppercase">
                      Active Blocks ({data.blocks.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {data.blocks.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-control border border-line bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-small font-medium text-ink">
                            Room #{b.roomNumber} ({b.roomTypeName})
                          </span>
                          <span className="rounded-control bg-destructive/10 px-2 py-0.5 font-mono text-micro font-semibold text-destructive uppercase">
                            {b.reason.replace('_', ' ')}
                          </span>
                        </div>
                        {b.notes && (
                          <p className="mt-1 text-caption text-muted-foreground">
                            {b.notes}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-micro text-muted-foreground">
                          {formatShort(b.startDate)} → {formatShort(b.endDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

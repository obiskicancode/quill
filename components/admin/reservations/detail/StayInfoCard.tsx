import { Bed, Calendar, Clock, Users } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import type { ReservationDetail } from '@/types/reservation.types';

export function StayInfoCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  return (
    <AdminCard title="Stay details">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Room Type & Number */}
        <div className="flex items-start gap-2.5">
          <Bed
            className="text-muted-foreground mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-caption text-muted-foreground font-semibold tracking-wider uppercase">
              Assigned Room
            </p>
            <p className="text-ink font-semibold">{reservation.roomTypeName}</p>
            <p className="text-small text-muted-foreground">
              Room #{reservation.roomNumber}
            </p>
            {reservation.extraBedAvailable && (
              <span className="text-caption text-muted-foreground mt-1 inline-block">
                Extra bed available
              </span>
            )}
          </div>
        </div>

        {/* Guests */}
        <div className="flex items-start gap-2.5">
          <Users
            className="text-muted-foreground mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-caption text-muted-foreground font-semibold tracking-wider uppercase">
              Guests
            </p>
            <p className="text-ink font-semibold">
              {reservation.adults}{' '}
              {reservation.adults === 1 ? 'Adult' : 'Adults'}
              {reservation.children > 0 && `, ${reservation.children} Children`}
            </p>
            <p className="text-small text-muted-foreground">
              {reservation.nights} nights stay
            </p>
          </div>
        </div>

        {/* Check-in */}
        <div className="flex items-start gap-2.5">
          <Calendar
            className="text-muted-foreground mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-caption text-muted-foreground font-semibold tracking-wider uppercase">
              Check-in
            </p>
            <p className="text-ink font-semibold">{reservation.checkIn}</p>
            <p className="text-caption text-muted-foreground">
              From {reservation.policySnapshot.checkInTime}
            </p>
            {reservation.arrivalTime && (
              <p className="text-caption text-ink mt-0.5 flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                ETA: {reservation.arrivalTime}
              </p>
            )}
          </div>
        </div>

        {/* Check-out */}
        <div className="flex items-start gap-2.5">
          <Calendar
            className="text-muted-foreground mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-caption text-muted-foreground font-semibold tracking-wider uppercase">
              Check-out
            </p>
            <p className="text-ink font-semibold">{reservation.checkOut}</p>
            <p className="text-caption text-muted-foreground">
              Until {reservation.policySnapshot.checkOutTime}
            </p>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}

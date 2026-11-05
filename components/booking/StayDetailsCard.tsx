'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { textLinkRecipe } from '@/components/ui/text-link';
import { formatMinor } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { GuestReservation } from '@/types/booking.types';

import { StayFacts } from '../checkout/SummaryCard';
import { Button } from '../ui/button';

/** The stay as booked: room, dates and times, guests, extras, requests and the guest's contact details (masked until verified). */
/** Pass `contact` (full details) on the manage page: they stay masked until the guest chooses to show them. */
export function StayDetailsCard({
  v,
  contact,
}: {
  v: GuestReservation;
  contact?: { email: string; phone: string };
}) {
  const [revealed, setRevealed] = useState(false);
  const email = contact && revealed ? contact.email : v.guest.email;
  const phone = contact && revealed ? contact.phone : v.guest.phone;
  const extras = [
    ...(v.breakdown.extraBed
      ? [
          {
            id: 'extra-bed',
            name: 'Extra bed',
            detail:
              v.breakdown.extraBed.perNightMinor === 0
                ? 'Free'
                : formatMinor(v.breakdown.extraBed.totalMinor),
          },
        ]
      : []),
    ...v.breakdown.extras.map((e) => ({
      id: e.id,
      name: e.quantity > 1 ? `${e.name} × ${e.quantity}` : e.name,
      detail: formatMinor(e.totalMinor),
    })),
  ];
  return (
    <section
      aria-labelledby="stay-title"
      className="space-y-5 rounded-card border border-line bg-card p-5 shadow-raised md:p-6"
    >
      <h2 id="stay-title" className="font-display text-h3">
        Your stay
      </h2>
      <StayFacts
        room={v.room}
        stay={v.stay}
        nights={v.stay.nights}
        hotelTimes={{ checkIn: v.times.checkIn, checkOut: v.times.checkOut }}
      />

      {extras.length > 0 && (
        <div className="border-t border-line pt-4">
          <h3 className="text-small font-semibold">Extras</h3>
          <ul className="mt-2 space-y-1 text-small">
            {extras.map((e) => (
              <li key={e.id} className="flex justify-between gap-4">
                <span>{e.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {e.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.guest.specialRequests && (
        <div className="border-t border-line pt-4">
          <h3 className="text-small font-semibold">Special requests</h3>
          <p className="mt-1 text-small whitespace-pre-line text-ink/85">
            {v.guest.specialRequests}
          </p>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <h3 className="text-small font-semibold">Guest</h3>
        <dl className="mt-2 space-y-1 text-small">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-semibold">{v.guest.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="tabular-nums">{phone}</dd>
          </div>
        </dl>
        {contact && (
          <Button
            type="button"
            variant="link"
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
            className={cn(textLinkRecipe, 'mt-2 gap-2 p-0 print:hidden')}
            icon={
              revealed ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )
            }
          >
            {revealed ? 'Hide contact details' : 'Show contact details'}
          </Button>
        )}
        {!v.verified && !contact && (
          <p className="mt-2 text-caption text-muted-foreground">
            Contact details are partly hidden for your privacy. Verify your
            booking to see them in full.
          </p>
        )}
      </div>
    </section>
  );
}

'use client';

import { unitLabels } from '@/lib/checkout/format';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation } from '@/types/booking.types';
import { formatMinor } from '@/types/stay.types';

import { StaggerGroup, StaggerItem } from '../motion';
import { ButtonLink } from '../ui/Button';

/** Extras the guest can still add. Omitted entirely unless the hotel supports adding extras after booking. */
export function AddExtrasStrip({
  v,
  mode = 'link',
}: {
  v: GuestReservation;
  /** 'whatsapp' sends the request to the hotel with the booking reference filled in. */ mode?:
    'link' | 'whatsapp';
}) {
  const site = useSite();
  const taken = new Set(v.breakdown.extras.map((e) => e.id));
  const open = v.addExtras.catalog.filter((e) => !taken.has(e.id));
  const live =
    v.status === 'confirmed' ||
    v.status === 'pending_approval' ||
    v.status === 'reserved_pay_at_hotel';
  if (!v.addExtras.supported || !live || open.length === 0) return null;
  return (
    <section
      id="add-extras"
      aria-labelledby="extras-title"
      className="print:hidden"
    >
      <h2 id="extras-title" className="font-display text-h3">
        Add something to your stay
      </h2>
      <StaggerGroup
        as="ul"
        staggerChildren={0.06}
        className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        {open.map((e) => (
          <StaggerItem
            key={e.id}
            as="li"
            scale
            className="flex h-full flex-col justify-between gap-4 rounded-card border border-line bg-surface p-5"
          >
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="mt-1 text-small text-muted">{e.description}</p>
              <p className="mt-2 text-small font-semibold tabular-nums">
                {formatMinor(e.priceMinor)} {unitLabels[e.unit]}
              </p>
            </div>
            <ButtonLink
              href={
                mode === 'whatsapp'
                  ? whatsappHref(
                      site,
                      `Hello, please add "${e.name}" to booking ${v.reference}.`,
                    )
                  : `/booking/manage?ref=${encodeURIComponent(v.reference)}&add=${encodeURIComponent(e.id)}`
              }
              external={mode === 'whatsapp'}
              variant="secondary"
              size="sm"
            >
              {mode === 'whatsapp'
                ? `Ask the hotel to add ${e.name.toLowerCase()}`
                : `Add ${e.name.toLowerCase()}`}
            </ButtonLink>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

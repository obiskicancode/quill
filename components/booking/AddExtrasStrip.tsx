'use client';

import { formatMinor, unitLabels } from '@/lib/format';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation } from '@/types/booking.types';

import { StaggerGroup, StaggerItem } from '../motion';
import { ButtonLink } from '../ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

/**
 * Extras the guest can still add. Omitted entirely unless the hotel supports
 * adding extras after booking. There is no self-service write for these, so the
 * request goes to the hotel on WhatsApp and the hotel adds it.
 */
export function AddExtrasStrip({ v }: { v: GuestReservation }) {
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
          <StaggerItem key={e.id} as="li" scale className="flex">
            {/* Tighter than the default card padding, but through the spacing
                token rather than size="sm": the sm title variant would pin the
                name back to caption size. */}
            <Card
              variant="flat"
              className="flex-1 [--card-spacing:--spacing(3)]"
            >
              <CardHeader>
                <CardTitle render={<h3 />} className="text-body font-semibold">
                  {e.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="grow">
                <p className="text-small text-muted-foreground">
                  {e.description}
                </p>
                <p className="mt-2 text-small font-semibold tabular-nums">
                  {formatMinor(e.priceMinor)} {unitLabels[e.unit]}
                </p>
              </CardContent>
              <CardFooter className="border-0 bg-transparent pt-0">
                <ButtonLink
                  href={whatsappHref(
                    site,
                    `Hello, please add "${e.name}" to booking ${v.reference}.`,
                  )}
                  external
                  variant="secondary"
                  size="sm"
                >
                  Ask the hotel to add {e.name.toLowerCase()}
                </ButtonLink>
              </CardFooter>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}

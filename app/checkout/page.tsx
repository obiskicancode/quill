import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { store } from '@/lib/checkout/mock-db';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getRoomDetail, hotelSettings } from '@/lib/room-detail';
import { parseRoomQuery } from '@/lib/room-query';
import { needsExtraBed } from '@/lib/stay-quote';

export const metadata: Metadata = {
  title: 'Secure checkout',
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const get = (name: string): string | null => {
    const v = sp[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };

  const slug = get('room');
  const room = slug ? getRoomDetail(slug) : null;
  const q = parseRoomQuery({ get });
  // Missing or invalid params go back to Rooms with a message.
  if (!room || !slug || !q.checkIn || !q.checkOut || q.checkOut <= q.checkIn)
    redirect('/rooms?notice=checkout');

  const demo = get('demo');
  const needs = needsExtraBed(room, q.adults, q.children);
  const seen = Number(get('seen'));

  // Returning from the payment provider: price the stay exactly as it was reserved (same extras, same extra bed).
  const reference = get('ref');
  const returning = Boolean(reference && get('return') === '1');
  const saved =
    returning && reference ? store.reservations.get(reference) : undefined;
  const quoteDemo = returning
    ? (demo ?? '')
        .split(',')
        .filter((d) => d && d !== 'unavailable' && d !== 'changed')
        .join(',') || null
    : demo;

  // The server re-quotes the stay. Prices in the URL are only used to show "Price updated", never to charge.
  const initialQuote = await buildCheckoutQuote({
    room: slug,
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    adults: q.adults,
    children: q.children,
    extraBed: saved ? saved.stay.extraBed : needs && get('extraBed') !== '0',
    extras: saved ? saved.extras : [],
    seenTotalMinor: returning
      ? null
      : Number.isInteger(seen) && seen > 0
        ? seen
        : null,
    demo: quoteDemo,
  });

  if (initialQuote.status === 'invalid') {
    if (initialQuote.reason === 'params') redirect('/rooms?notice=checkout');
    // A rule (minimum nights and so on): the room page explains it and offers the fix.
    redirect(
      `/rooms/${slug}?checkIn=${q.checkIn}&checkOut=${q.checkOut}&adults=${q.adults}&children=${q.children}`,
    );
  }

  const cover = room.gallery[0] ?? null;

  return (
    <CheckoutShell>
      <CheckoutFlow
        room={{
          slug: room.slug,
          name: room.name,
          bedConfig: room.bedConfig,
          image: cover ? { src: cover.src, alt: cover.alt } : null,
        }}
        stay={{
          checkIn: q.checkIn,
          checkOut: q.checkOut,
          adults: q.adults,
          children: q.children,
        }}
        initialQuote={initialQuote}
        demo={demo}
        seenTotalMinor={Number.isInteger(seen) && seen > 0 ? seen : null}
        resumeReference={returning ? reference : null}
        hotelTimes={{
          checkIn: hotelSettings.checkInTime,
          checkOut: hotelSettings.checkOutTime,
        }}
      />
    </CheckoutShell>
  );
}

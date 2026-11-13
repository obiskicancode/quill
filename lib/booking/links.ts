/**
 * Builds URLs that carry a stay (dates and guests) between public pages.
 */
import type { StayInput } from '@/types/stay.types';

/** Serialises the stay into query parameters, omitting empty dates. */
export function stayParams(stay: StayInput): URLSearchParams {
  const params = new URLSearchParams();
  if (stay.checkIn && stay.checkOut) {
    params.set('checkIn', stay.checkIn);
    params.set('checkOut', stay.checkOut);
  }
  params.set('adults', String(stay.adults));
  params.set('children', String(stay.children));
  return params;
}

/** Link into Checkout with the chosen room, dates, guests and extra bed. */
export function bookingHref(
  base: string,
  slug: string,
  stay: StayInput,
): string {
  const params = stayParams(stay);
  params.set('room', slug);
  if (stay.extraBed) params.set('extraBed', '1');
  return `${base}?${params.toString()}`;
}

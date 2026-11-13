/**
 * Public room-search state: limits, defaults, validation and shareable links.
 */

import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { ISODate } from '@/types/dates.types';
import type { SearchState } from '@/types/site.types';

/** Maximum adults accepted by the room search. */
export const MAX_ADULTS = 10;
/** Maximum children accepted by the room search. */
export const MAX_CHILDREN = 6;

/** Default search state before the guest chooses dates or guests. */
export const initialSearch: SearchState = {
  checkIn: null,
  checkOut: null,
  adults: 2,
  children: 0,
};

/** Returns a plain-language error, or null when the search can run. */
export function validateSearch(s: SearchState, today: ISODate): string | null {
  if (!s.checkIn || !s.checkOut) return ERROR_MESSAGES.SEARCH_DATES_REQUIRED;
  if (s.checkIn < today) return ERROR_MESSAGES.CHECKIN_IN_PAST;
  if (s.checkOut <= s.checkIn) return ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN;
  if (s.adults < 1) return ERROR_MESSAGES.SEARCH_ADULT_REQUIRED;
  return null;
}

/** Builds a room-search URL from the current search state. */
export function buildSearchHref(base: string, s: SearchState): string {
  const params = new URLSearchParams({
    checkIn: s.checkIn ?? '',
    checkOut: s.checkOut ?? '',
    adults: String(s.adults),
    children: String(s.children),
  });
  return `${base}?${params.toString()}`;
}

/** Human-readable guest summary, e.g. "2 adults, 1 child". */
export function guestSummary(
  s: Pick<SearchState, 'adults' | 'children'>,
): string {
  const adults = `${s.adults} ${s.adults === 1 ? 'adult' : 'adults'}`;
  if (s.children === 0) return adults;
  return `${adults}, ${s.children} ${s.children === 1 ? 'child' : 'children'}`;
}

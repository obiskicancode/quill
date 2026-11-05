import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatDayMonth, fromISO, toISO } from '@/lib/dates';
import type { ISODate } from '@/types/dates.types';
import type {
  BedType,
  FilterAmenity,
  RoomQuery,
  SortKey,
} from '@/types/rooms.types';

import { emptyFilters, filterAmenityOptions, sortOptions } from './catalog';
import { MAX_ADULTS, MAX_CHILDREN } from './search';

interface ParamsLike {
  get(name: string): string | null;
}

const BEDS: BedType[] = ['queen', 'king', 'twin', 'double'];

function validDate(value: string | null): ISODate | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return toISO(fromISO(value)) === value ? value : null;
}

function int(value: string | null, min: number, max: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

function list<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T[] {
  if (!value) return [];
  return value
    .split(',')
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseRoomQuery(p: ParamsLike): RoomQuery {
  const sort = p.get('sort') as SortKey | null;
  return {
    checkIn: validDate(p.get('checkIn')),
    checkOut: validDate(p.get('checkOut')),
    adults: int(p.get('adults'), 1, MAX_ADULTS) ?? 2,
    children: int(p.get('children'), 0, MAX_CHILDREN) ?? 0,
    sort: sortOptions.some((o) => o.key === sort)
      ? (sort as SortKey)
      : 'recommended',
    filters: {
      minPrice: int(p.get('minPrice'), 0, 100_000_000),
      maxPrice: int(p.get('maxPrice'), 0, 100_000_000),
      minGuests: int(p.get('minGuests'), 2, 20),
      beds: list(p.get('beds'), BEDS),
      amenities: list(
        p.get('amenities'),
        filterAmenityOptions.map((o) => o.key) as FilterAmenity[],
      ),
    },
    count: int(p.get('count'), 1, 8),
  };
}

/** Returns a query string without the leading "?". Defaults are left out to keep URLs short. */
export function serializeRoomQuery(q: RoomQuery): string {
  const p = new URLSearchParams();
  if (q.checkIn) p.set('checkIn', q.checkIn);
  if (q.checkOut) p.set('checkOut', q.checkOut);
  if (q.checkIn || q.checkOut || q.adults !== 2)
    p.set('adults', String(q.adults));
  if (q.checkIn || q.checkOut || q.children !== 0)
    p.set('children', String(q.children));
  if (q.sort !== 'recommended') p.set('sort', q.sort);
  const f = q.filters;
  if (f.minPrice !== null) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== null) p.set('maxPrice', String(f.maxPrice));
  if (f.minGuests !== null) p.set('minGuests', String(f.minGuests));
  if (f.beds.length) p.set('beds', f.beds.join(','));
  if (f.amenities.length) p.set('amenities', f.amenities.join(','));
  if (q.count) p.set('count', String(q.count));
  return p.toString();
}

export const hasFilters = (q: RoomQuery) =>
  JSON.stringify(q.filters) !== JSON.stringify(emptyFilters);

/** Plain-language fix for a bad stay in the URL, or null when it is fine. */
export function stayProblem(q: RoomQuery, today: ISODate): string | null {
  if (!q.checkIn && !q.checkOut) return null;
  if (q.checkIn && !q.checkOut)
    return 'Choose a check-out date to see prices for your stay.';
  if (!q.checkIn && q.checkOut)
    return 'Choose a check-in date to see prices for your stay.';
  if (q.checkIn && q.checkOut && q.checkOut <= q.checkIn)
    return ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN_NEW_DATES;
  if (q.checkIn && q.checkIn < today)
    return ERROR_MESSAGES.CHECKIN_IN_PAST_LATER_DATE;
  return null;
}

export const totalGuests = (q: Pick<RoomQuery, 'adults' | 'children'>) =>
  q.adults + q.children;

/** "12 to 15 Nov", or "30 Oct to 2 Nov" across months. */
export function formatRange(a: ISODate, b: ISODate): string {
  const da = fromISO(a);
  const db = fromISO(b);
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear())
    return `${da.getDate()} to ${formatDayMonth(b)}`;
  return `${formatDayMonth(a)} to ${formatDayMonth(b)}`;
}

/** Builds a link that carries the current stay (dates and guests) to another page. */
export function stayHref(
  base: string,
  q: RoomQuery,
  extra: Record<string, string> = {},
): string {
  const p = new URLSearchParams(extra);
  if (q.checkIn && q.checkOut) {
    p.set('checkIn', q.checkIn);
    p.set('checkOut', q.checkOut);
  }
  p.set('adults', String(q.adults));
  p.set('children', String(q.children));
  return `${base}?${p.toString()}`;
}

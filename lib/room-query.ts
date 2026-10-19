import type { DemoMode } from './availability';
import { fromISO, toISO, type ISODate } from './dates';
import {
  emptyFilters,
  filterAmenityOptions,
  sortOptions,
  type BedType,
  type FilterAmenity,
  type RoomFilters,
  type SortKey,
} from './rooms';
import { MAX_ADULTS, MAX_CHILDREN } from './search';

/** Everything the page needs lives in the URL, so views can be shared, bookmarked and carried into detail and checkout links. */
export interface RoomQuery {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  adults: number;
  children: number;
  sort: SortKey;
  filters: RoomFilters;
  /** Preview helpers, used by the dev-only PreviewBar. */
  demo: DemoMode | null;
  count: number | null;
}

interface ParamsLike {
  get(name: string): string | null;
}

const BEDS: BedType[] = ['queen', 'king', 'twin', 'double'];
const DEMOS: DemoMode[] = ['loading', 'error', 'soldout', 'low'];

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
  const demo = p.get('demo') as DemoMode | null;
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
    demo: demo && DEMOS.includes(demo) ? demo : null,
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
  if (q.demo) p.set('demo', q.demo);
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
    return 'Check-out must be after check-in. Choose new dates.';
  if (q.checkIn && q.checkIn < today)
    return "Check-in can't be in the past. Choose a later date.";
  return null;
}

export const totalGuests = (q: Pick<RoomQuery, 'adults' | 'children'>) =>
  q.adults + q.children;

const dayMonth = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
});

/** "12 to 15 Nov", or "30 Oct to 2 Nov" across months. */
export function formatRange(a: ISODate, b: ISODate): string {
  const da = fromISO(a);
  const db = fromISO(b);
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear())
    return `${da.getDate()} to ${dayMonth.format(db)}`;
  return `${dayMonth.format(da)} to ${dayMonth.format(db)}`;
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

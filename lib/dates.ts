/**
 * Calendar-date helpers for the booking domain. Every date that crosses these
 * helpers is an ISO `YYYY-MM-DD` string in the hotel's local calendar, not an
 * instant; display formatting lives in `lib/format`.
 */
import type { Clock, ISODate } from '@/types/dates.types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a local `Date` as an ISO calendar date. */
export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses an ISO calendar date into a local `Date` at midnight. */
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The server's current local calendar date as ISO. */
export const todayISO = (): ISODate => toISO(new Date());

/** Adds or subtracts whole calendar days, crossing month and year boundaries. */
export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** First day of the month containing `iso`. */
export const startOfMonth = (iso: ISODate): ISODate => `${iso.slice(0, 7)}-01`;

/** Number of days in the month containing `iso`. */
export function daysInMonth(iso: ISODate): number {
  const d = fromISO(startOfMonth(iso));
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** First day of the month n months away. */
export function addMonths(iso: ISODate, n: number): ISODate {
  const d = fromISO(startOfMonth(iso));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

/** Same day-of-month n months away, clamped to the month length. */
export function shiftMonth(iso: ISODate, n: number): ISODate {
  const day = fromISO(iso).getDate();
  const first = addMonths(iso, n);
  return `${first.slice(0, 7)}-${pad(Math.min(day, daysInMonth(first)))}`;
}

/** Day of week for an ISO date, using `0 = Sunday` through `6 = Saturday`. */
export const sundayIndex = (iso: ISODate): number => fromISO(iso).getDay();

/** Number of nights between two ISO dates, using the `[a, b)` convention. */
export const nightsBetween = (a: ISODate, b: ISODate): number =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

const shortFmt = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const longFmt = new Intl.DateTimeFormat('en-NG', { dateStyle: 'full' });
const monthFmt = new Intl.DateTimeFormat('en-NG', {
  month: 'long',
  year: 'numeric',
});
const dayMonthFmt = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
});
const dayMonthYearFmt = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const weekdayFmt = new Intl.DateTimeFormat('en-NG', { weekday: 'short' });
const weekdayDayFmt = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
});
const guestStampFmt = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
});

/** Compact guest date, e.g. `Thu, 12 Nov`. */
export const formatShort = (iso: ISODate) => shortFmt.format(fromISO(iso));
/** Long guest date, e.g. `Thursday, 12 November 2026`. */
export const formatLong = (iso: ISODate) => longFmt.format(fromISO(iso));
/** Month and year, e.g. `November 2026`. */
export const formatMonthYear = (iso: ISODate) => monthFmt.format(fromISO(iso));
/** Day and month, e.g. `12 Nov`. */
export const formatDayMonth = (iso: ISODate) =>
  dayMonthFmt.format(fromISO(iso));
/** Day, month and year, e.g. `12 November 2026`. */
export const formatDayMonthYear = (iso: ISODate) =>
  dayMonthYearFmt.format(fromISO(iso));
/** Weekday only, e.g. `Thu`. */
export const formatWeekday = (iso: ISODate) => weekdayFmt.format(fromISO(iso));
/** Weekday and day, e.g. `Thu 12`. */
export const formatWeekdayDay = (iso: ISODate) =>
  weekdayDayFmt.format(fromISO(iso));
/** Guest-facing date and time in the hotel's Lagos timezone. */
export const formatGuestStamp = (value: string | Date) =>
  guestStampFmt.format(value instanceof Date ? value : new Date(value));

/**
 * Current date and minutes since midnight in the hotel's timezone. Callers use
 * this instead of `new Date()` so cut-off rules and backdating checks agree
 * with the hotel's calendar rather than the server's zone.
 */
export function hotelClock(
  now: Date = new Date(),
  timeZone = 'Africa/Lagos',
): Clock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  return { today: `${get('year')}-${get('month')}-${get('day')}`, minutes };
}

import { formatDayMonth } from '@/lib/dates';
import type { ISODate } from '@/types/dates.types';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const nairaExact = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const digits = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
const digitsExact = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNaira = (amount: number): string => naira.format(amount);

/** Digits only — for inputs and chips that carry their own ₦ adornment. */
export const formatNairaDigits = (amount: number): string =>
  digits.format(amount);

export const formatMinor = (minor: number): string => naira.format(minor / 100);

export const formatMinorExact = (minor: number): string =>
  nairaExact.format(minor / 100);

export const formatMinorDigits = (minor: number, decimals = false): string =>
  (decimals ? digitsExact : digits).format(minor / 100);

/**
 * Ops timestamps render in the hotel's own day. Most admin surfaces formatted
 * in the viewer's zone, so an event logged at 23:50 Lagos time read as the next
 * morning on a laptop set to UTC; the audit screen was the one place passing
 * `timeZone` explicitly, and that is now the rule for every stamp. `en-GB`
 * carries over from it because 24-hour times are what ops surfaces use — guest
 * dates stay on the hotel locale in `lib/dates`.
 */
export const HOTEL_TIME_ZONE = 'Africa/Lagos';

type HotelStamp = string | Date;

type StampShape =
  'datetime' | 'date' | 'time' | 'time-seconds' | 'day-month' | 'full-date';

const SHAPES: Record<StampShape, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
  date: { day: '2-digit', month: 'short', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
  'time-seconds': {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  },
  'day-month': { day: '2-digit', month: 'short' },
  'full-date': {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
};

const stampCache = new Map<string, Intl.DateTimeFormat>();

function hotelStamp(shape: StampShape, timeZone: string) {
  const key = `${shape}|${timeZone}`;
  let f = stampCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      ...SHAPES[shape],
    });
    stampCache.set(key, f);
  }
  return f;
}

const stamp: (
  shape: StampShape,
) => (value: HotelStamp, timeZone?: string) => string =
  (shape: StampShape) =>
  (value: HotelStamp, timeZone = HOTEL_TIME_ZONE): string =>
    hotelStamp(shape, timeZone).format(
      value instanceof Date ? value : new Date(value),
    );

/** "12 Nov 2026, 14:32" */
export const formatHotelDateTime = stamp('datetime');
/** "12 Nov 2026" */
export const formatHotelDate = stamp('date');
/** "14:32" */
export const formatHotelTime = stamp('time');
/** "14:32:07" — provider webhooks are seconds apart. */
export const formatHotelTimeWithSeconds = stamp('time-seconds');
/** "12 Nov" — the compact column in a dense audit row. */
export const formatHotelDayMonth = stamp('day-month');
/** "Thursday, 5 November 2026" — a page's own header, not a table cell. */
export const formatHotelFullDate = stamp('full-date');

export function formatSecondary(
  currency: 'USD' | 'GBP' | 'EUR',
  amount: number,
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** { date: "2026-11-12", time: "14:00" } becomes "12 Nov, 2:00 PM". */
export function formatDeadline(d: { date: ISODate; time: string }): string {
  const [h, m] = d.time.split(':').map(Number);
  return `${formatDayMonth(d.date)}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const unitLabels = {
  per_stay: 'per stay',
  per_night: 'per night',
  per_guest: 'per guest',
  per_guest_per_night: 'per guest per night',
} as const;

export function pluralCount(
  n: number,
  one: string,
  many: string = `${one}s`,
): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A stored clock value ("14:00", "14:00:00") as guests read it: "2 pm", "2:30 pm". */
export function formatGuestTime(value: string): string {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute ?? '0');
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const suffix = hour >= 12 ? 'pm' : 'am';
  const hour12 = ((hour + 11) % 12) + 1;
  return minute === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

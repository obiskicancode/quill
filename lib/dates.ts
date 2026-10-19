/** All dates are local calendar dates as "YYYY-MM-DD". Never use toISOString() for these (it shifts to UTC). */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = (): ISODate => toISO(new Date());

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const startOfMonth = (iso: ISODate): ISODate => `${iso.slice(0, 7)}-01`;

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

/** Monday = 0 ... Sunday = 6 */
export const mondayIndex = (iso: ISODate): number =>
  (fromISO(iso).getDay() + 6) % 7;

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

export const formatShort = (iso: ISODate) => shortFmt.format(fromISO(iso));
export const formatLong = (iso: ISODate) => longFmt.format(fromISO(iso));
export const formatMonthYear = (iso: ISODate) => monthFmt.format(fromISO(iso));

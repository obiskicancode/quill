import { fromISO, type ISODate } from '../dates';

const dayMonth = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
});

/** { date: "2026-11-12", time: "14:00" } becomes "12 Nov, 2:00 PM". */
export function formatDeadline(d: { date: ISODate; time: string }): string {
  const [h, m] = d.time.split(':').map(Number);
  return `${dayMonth.format(fromISO(d.date))}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
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

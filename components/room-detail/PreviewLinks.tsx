import Link from 'next/link';

import { config } from '@/config';
import { addDays } from '@/lib/dates';
import { hotelClock } from '@/lib/stay-quote';

/** Development-only shortcuts to every booking-card state. Not rendered in production builds. */
export function PreviewLinks({ slug }: { slug: string }) {
  if (config.isProd) return null;
  const today = hotelClock().today;
  const start = addDays(today, 14);
  const base = (extra: Record<string, string>, room = slug) => {
    const p = new URLSearchParams({
      checkIn: start,
      checkOut: addDays(start, 3),
      adults: '2',
      children: '0',
      ...extra,
    });
    return `/rooms/${room}?${p.toString()}`;
  };
  const links: [string, string][] = [
    ['No dates', `/rooms/${slug}`],
    ['Available', base({})],
    [
      'Weekend and peak rates',
      base({ checkIn: '2026-12-24', checkOut: '2026-12-28' }),
    ],
    ['Low availability', base({ demo: 'low' })],
    ['Sold out', base({ demo: 'soldout' })],
    ['Checking', base({ demo: 'loading' })],
    ['Error', base({ demo: 'error' })],
    ['Price hidden', base({}, 'family-apartment')],
    [
      'Check-out before check-in',
      base({ checkIn: addDays(start, 3), checkOut: start }),
    ],
    [
      'Below minimum nights',
      base({ checkOut: addDays(start, 1) }, 'one-bedroom-apartment'),
    ],
    ['Above maximum nights', base({ checkOut: addDays(start, 40) })],
    [
      'Beyond booking window',
      base({ checkIn: addDays(today, 400), checkOut: addDays(today, 403) }),
    ],
    [
      'Same-day after cut-off',
      base({ checkIn: today, checkOut: addDays(today, 1), demo: 'late' }),
    ],
    ['Guests above capacity', base({ adults: '9' })],
    ['Extra bed needed', base({ adults: '2', children: '1' }, 'classic-room')],
    [
      'Extra bed not available',
      base({ adults: '3', children: '1' }, 'one-bedroom-apartment'),
    ],
  ];
  return (
    <div className="border-b border-dashed border-ink/40 bg-accent/20 py-3">
      <div className="container-page flex flex-wrap items-center gap-2 text-small">
        <span className="font-semibold">Preview (dev only):</span>
        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="inline-flex min-h-11 items-center rounded-full border border-ink/60 bg-surface px-3 font-medium hover:bg-ink hover:text-paper"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

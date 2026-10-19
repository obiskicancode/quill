'use client';

import { config } from '@/config';
import type { DemoMode } from '@/lib/availability';
import { addDays, todayISO } from '@/lib/dates';
import type { RoomQuery } from '@/lib/room-query';

import { Button } from '../ui/Button';

/** Development-only controls for previewing every card state. Not rendered in production builds. */
export function PreviewBar({
  query,
  onChange,
}: {
  query: RoomQuery;
  onChange: (patch: Partial<RoomQuery>) => void;
}) {
  if (config.isProd) return null;

  const start = addDays(todayISO(), 14);
  const demos: { label: string; value: DemoMode | null }[] = [
    { label: 'Live mock', value: null },
    { label: 'Loading', value: 'loading' },
    { label: 'Error', value: 'error' },
    { label: 'Sold out', value: 'soldout' },
    { label: 'Low availability', value: 'low' },
  ];

  return (
    <div className="border-b border-dashed border-ink/40 bg-accent/20 py-3">
      <div className="container-page flex flex-wrap items-center gap-2 text-small">
        <span className="font-semibold">Preview (dev only):</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({ checkIn: start, checkOut: addDays(start, 3) })
          }
        >
          Sample dates
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({ checkIn: start, checkOut: addDays(start, 1) })
          }
        >
          1 night (min-stay)
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({ checkIn: addDays(start, 3), checkOut: start })
          }
        >
          Invalid dates
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange({ checkIn: null, checkOut: null })}
        >
          No dates
        </Button>
        <span aria-hidden>|</span>
        {demos.map((d) => (
          <Button
            key={d.label}
            size="sm"
            variant={query.demo === d.value ? 'dark' : 'secondary'}
            onClick={() => onChange({ demo: d.value })}
          >
            {d.label}
          </Button>
        ))}
        <span aria-hidden>|</span>
        {[1, 2, 3, 8].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={query.count === n ? 'dark' : 'secondary'}
            onClick={() => onChange({ count: n })}
          >
            {n} {n === 1 ? 'room' : 'rooms'}
          </Button>
        ))}
        <Button
          size="sm"
          variant={query.count === null ? 'dark' : 'secondary'}
          onClick={() => onChange({ count: null })}
        >
          All
        </Button>
      </div>
    </div>
  );
}

'use client';

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';

import { formatNaira } from '@/lib/format';
import type { RoomType, StayParams } from '@/lib/rooms';

import { useAvailability } from '../rooms/useAvailability';
import { Button } from '../ui/button';

interface AvailabilityHintProps {
  rooms: RoomType[];
  /** "" means no preferred room: every room is checked. */
  roomSlug: string;
  stay: StayParams | null;
}

/**
 * A small live-availability note for the dates and room picked above. It is a convenience,
 * never a commitment: the real check runs again at checkout. The block keeps its height while
 * loading so nothing jumps.
 */
export function AvailabilityHint({
  rooms,
  roomSlug,
  stay,
}: AvailabilityHintProps) {
  const subset = useMemo(() => {
    if (!roomSlug) return rooms;
    const one = rooms.filter((r) => r.slug === roomSlug);
    return one.length > 0 ? one : rooms;
  }, [rooms, roomSlug]);

  const { status, data, retry } = useAvailability(subset, stay);

  if (!stay) {
    return (
      <div className="rounded-card border-line bg-card text-small text-muted-foreground min-h-[3.5rem] border px-4 py-3">
        Choose your dates to see live availability.
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div
        className="rounded-card border-line bg-card text-small text-muted-foreground min-h-[3.5rem] border px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2">
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          Checking availability for your dates…
        </span>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="rounded-card border-destructive bg-destructive/5 text-small min-h-[3.5rem] border-2 px-4 py-3">
        <p className="text-destructive flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Live availability could not be loaded.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="size-4" aria-hidden />}
          onClick={retry}
          className="mt-2"
        >
          Check again
        </Button>
      </div>
    );
  }

  const results = subset
    .map((room) => ({ room, result: data[room.id] }))
    .filter((x) => x.result);
  if (results.length === 0) return null;

  const notes = results.map(({ room, result }) => {
    switch (result!.status) {
      case 'available':
        return {
          room,
          tone: 'ok' as const,
          text: `${result!.remaining} ${result!.remaining === 1 ? 'room' : 'rooms'} left for these dates.`,
        };
      case 'sold-out':
        return {
          room,
          tone: 'bad' as const,
          text: 'Fully booked for these dates. Try the suggested dates above, or send the enquiry anyway and we will suggest alternatives.',
        };
      case 'min-stay':
        return {
          room,
          tone: 'warn' as const,
          text: `Needs a stay of at least ${result!.minNights} nights.`,
        };
      case 'over-capacity':
        return {
          room,
          tone: 'warn' as const,
          text: `Seats up to ${result!.maxAdults} adults and ${result!.maxChildren} children.`,
        };
      default:
        return {
          room,
          tone: 'info' as const,
          text: 'On request — send the enquiry and we will confirm availability.',
        };
    }
  });

  return (
    <div
      className="rounded-card border-line bg-card text-small border px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="text-brand-ink size-4 shrink-0" aria-hidden />
        Live availability
      </p>
      <ul className="mt-2 space-y-1.5">
        {notes.map(({ room, tone, text }) => (
          <li
            key={room.id}
            className={
              tone === 'bad'
                ? 'text-destructive'
                : tone === 'warn'
                  ? 'text-ink/85'
                  : 'text-ink/85'
            }
          >
            {subset.length > 1 && (
              <span className="font-semibold">{room.name}: </span>
            )}
            {text}
          </li>
        ))}
      </ul>
      {notes.every((n) => n.tone === 'ok') &&
        results[0]?.result?.status === 'available' && (
          <p className="text-muted-foreground mt-2">
            From{' '}
            <span className="text-ink font-semibold">
              {formatNaira(results[0].result!.averageNgn)}
            </span>{' '}
            a night.
          </p>
        )}
    </div>
  );
}

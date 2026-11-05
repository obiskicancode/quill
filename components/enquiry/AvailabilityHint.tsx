'use client';

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { useAvailability } from '@/hooks/services/guest/use-availability';
import { formatNaira, pluralCount } from '@/lib/format';
import type { RoomType, StayParams } from '@/types/rooms.types';

import { Button } from '../ui/button';

interface AvailabilityHintProps {
  rooms: RoomType[];
  /** "" means no preferred room: every room is checked. */
  roomSlug: string;
  stay: StayParams | null;
}

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
      <Alert
        variant="default"
        size="panel"
        className="min-h-14 text-muted-foreground"
      >
        Choose your dates to see live availability.
      </Alert>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <Alert
        variant="default"
        size="panel"
        role="status"
        aria-live="polite"
        className="min-h-14 items-center gap-2 text-muted-foreground"
      >
        <Loader2
          className="animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        Checking availability for your dates…
      </Alert>
    );
  }

  if (status === 'error' || !data) {
    return (
      <Alert
        variant="destructive"
        size="panel"
        role="alert"
        className="min-h-14 gap-2"
      >
        <AlertTitle className="flex items-center gap-2 font-medium">
          <AlertTriangle aria-hidden />
          Live availability could not be loaded.
        </AlertTitle>
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="size-4" aria-hidden />}
          onClick={retry}
          className="mt-2"
        >
          Check again
        </Button>
      </Alert>
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
          text: 'Fully booked for these dates. Send the enquiry anyway and we will suggest alternatives.',
        };
      case 'min-stay':
        return {
          room,
          tone: 'warn' as const,
          text: `Needs a stay of at least ${pluralCount(result!.minNights, 'night')}.`,
        };
      case 'over-capacity':
        return {
          room,
          tone: 'warn' as const,
          text: `Seats up to ${pluralCount(result!.maxAdults, 'adult')} and ${pluralCount(result!.maxChildren, 'child', 'children')}.`,
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
    <Alert variant="default" size="panel" role="status" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="size-4 shrink-0 text-brand-ink" aria-hidden />
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
                  ? 'text-warning'
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
          <p className="mt-2 text-muted-foreground">
            From{' '}
            <span className="font-semibold text-ink">
              {formatNaira(results[0].result!.averageNgn)}
            </span>{' '}
            a night.
          </p>
        )}
    </Alert>
  );
}

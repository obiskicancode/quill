'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { pluralCount } from '@/lib/format';

import { Reveal } from '../motion';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

const MINUTE_MS = 60_000;

/**
 * The signed-in window for one booking, and a way to leave it early.
 * The calm line counts minutes; the warning only appears in the last two minutes,
 * when an edit still open on the screen is about to be cut off, and it is what the
 * screen reader hears — minutes changing every 60 seconds would be noise.
 */
export function SessionBar({
  expiresAt,
  onSignOut,
  busy,
}: {
  expiresAt: string;
  onSignOut: () => void;
  busy: boolean;
}) {
  const [minutes, setMinutes] = useState(() =>
    Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / MINUTE_MS)),
  );
  useEffect(() => {
    const tick = () =>
      setMinutes(
        Math.max(
          0,
          Math.ceil((Date.parse(expiresAt) - Date.now()) / MINUTE_MS),
        ),
      );
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  const ending = minutes <= 2;

  return (
    <Reveal className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-paper p-3 text-small">
        <p>
          {minutes > 0
            ? `Signed in to this booking. ${pluralCount(minutes, 'minute left', 'minutes left')}.`
            : 'This sign-in has ended.'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          icon={<LogOut className="size-4" aria-hidden />}
          onClick={onSignOut}
        >
          Sign out of this booking
        </Button>
      </div>
      {ending && (
        <Alert role="status" variant="warning" size="panel">
          <AlertTitle>
            {minutes > 0
              ? `This sign-in ends in ${pluralCount(minutes, 'minute')}`
              : 'This sign-in has ended'}
          </AlertTitle>
          <AlertDescription>
            <p>
              Save anything you are editing now. After the time is up you will
              have to confirm the booking again, and changes that were not saved
              will be lost.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </Reveal>
  );
}

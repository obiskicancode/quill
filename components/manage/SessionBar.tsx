'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Reveal } from '../motion';
import { Button } from '../ui/button';

/** "Session expires in N min" and "Sign out of this booking". The booking is managed in a short, signed-in window. */
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
    Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 60000)),
  );
  useEffect(() => {
    const tick = () =>
      setMinutes(
        Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 60000)),
      );
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return (
    <Reveal className="rounded-control bg-paper text-small flex flex-wrap items-center justify-between gap-3 p-3 print:hidden">
      <p>
        {minutes > 0
          ? `Session expires in ${minutes} ${minutes === 1 ? 'min' : 'min'}`
          : 'Your session is about to end'}
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
    </Reveal>
  );
}

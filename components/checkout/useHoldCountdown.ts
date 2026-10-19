'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to the hold expiry using the server's clock (skew-corrected).
 * The screen-reader announcement changes only at 5 minutes, 2 minutes and expiry, never every second.
 */
export function useHoldCountdown(expiresAtMs: number | null, skewMs: number) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const said = useRef({ five: false, two: false, done: false });

  useEffect(() => {
    said.current = { five: false, two: false, done: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset announcements when the hold changes
    setAnnouncement('');
    if (expiresAtMs === null) {
      setRemainingMs(null);
      return;
    }
    const tick = () => {
      const left = expiresAtMs - (Date.now() + skewMs);
      setRemainingMs(left);
      const s = said.current;
      if (left <= 0 && !s.done) {
        s.done = true;
        setAnnouncement('Your hold on this room has expired.');
      } else if (left <= 120_000 && !s.two) {
        s.two = true;
        setAnnouncement('Two minutes left on your hold.');
      } else if (left <= 300_000 && left > 120_000 && !s.five) {
        s.five = true;
        setAnnouncement('Five minutes left on your hold.');
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAtMs, skewMs]);

  return {
    remainingMs,
    announcement,
    expiring: remainingMs !== null && remainingMs > 0 && remainingMs <= 120_000,
    expired: remainingMs !== null && remainingMs <= 0,
  };
}

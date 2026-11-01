'use client';

import { useEffect, useRef, useState } from 'react';

import { ERROR_MESSAGES } from '@/constants/error-messages';

/**
 * Counts down to the hold expiry using the server's clock (skew-corrected).
 * The screen-reader announcement changes only at 5 minutes, 2 minutes and expiry, never every second.
 */
export function useHoldCountdown(
  expiresAtMs: number | null,
  skewMs: number,
  /**
   * The server's clock at the response that set `expiresAtMs`, when known.
   * The skew is then measured inside the effect, where reading the clock is
   * allowed (rendering must stay pure).
   */
  serverNowMs?: number,
) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Clear a stale announcement as soon as the hold it refers to changes.
  const [prevHold, setPrevHold] = useState<{
    e: number | null;
    s: number;
    n?: number;
  }>({ e: null, s: 0 });
  if (
    prevHold.e !== expiresAtMs ||
    prevHold.s !== skewMs ||
    prevHold.n !== serverNowMs
  ) {
    setPrevHold({ e: expiresAtMs, s: skewMs, n: serverNowMs });
    if (announcement !== '') setAnnouncement('');
    if (expiresAtMs === null) setRemainingMs(null);
  }
  const said = useRef({ five: false, two: false, done: false });

  useEffect(() => {
    said.current = { five: false, two: false, done: false };
    if (expiresAtMs === null) return;
    const skew = serverNowMs !== undefined ? serverNowMs - Date.now() : skewMs;
    const tick = () => {
      const left = expiresAtMs - (Date.now() + skew);
      setRemainingMs(left);
      const s = said.current;
      if (left <= 0 && !s.done) {
        s.done = true;
        setAnnouncement(ERROR_MESSAGES.HOLD_EXPIRED_ROOM);
      } else if (left <= 120_000 && !s.two) {
        s.two = true;
        setAnnouncement(ERROR_MESSAGES.TWO_MINUTES_LEFT);
      } else if (left <= 300_000 && left > 120_000 && !s.five) {
        s.five = true;
        setAnnouncement(ERROR_MESSAGES.FIVE_MINUTES_LEFT);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAtMs, skewMs, serverNowMs]);

  return {
    remainingMs,
    announcement,
    expiring: remainingMs !== null && remainingMs > 0 && remainingMs <= 120_000,
    expired: remainingMs !== null && remainingMs <= 0,
  };
}

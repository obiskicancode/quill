'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { bookingService } from '@/app/api/services/booking.service';
import { formatCountdown } from '@/lib/format';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { EASE_OUT } from '../motion/variants';
import { Button } from '../ui/button';

type State = 'idle' | 'sending' | 'sent' | 'limited' | 'failed';

interface ResendEmailProps {
  reference: string;
  maskedEmail: string;
  /** Sentence start: "A confirmation was sent to" and similar. */
  lead: string;
}

/** One-line email note with Resend email: idle, sending, sent (cooldown timer), rate-limited and failed. Result is announced politely. */
export function ResendEmail({
  reference,
  maskedEmail,
  lead,
}: ResendEmailProps) {
  const site = useSite();
  const [state, setState] = useState<State>('idle');
  const [cooldown, setCooldown] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function resend() {
    if (state === 'sending' || cooldown > 0) return;
    setState('sending');
    try {
      const r = (await bookingService.resend(reference)).data;
      setCooldown(r.cooldownSeconds);
      setState('sent');
    } catch (e) {
      if (e instanceof ServiceError && e.status === 429) {
        setCooldown(e.body?.retryAfterSeconds ?? 60);
        setState('limited');
      } else setState('failed');
    }
  }

  const message =
    state === 'sent'
      ? 'Email sent.'
      : state === 'limited'
        ? 'Please wait before asking for another email.'
        : state === 'failed'
          ? "We couldn't send the email. Please try again."
          : '';

  return (
    <div className="text-small flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="inline-flex items-center gap-2">
        <Mail className="text-brand-ink size-4" aria-hidden />
        <span>
          {lead} <span className="font-semibold">{maskedEmail}</span>
        </span>
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={state === 'sending'}
        disabled={cooldown > 0}
        onClick={resend}
      >
        {cooldown > 0
          ? `Resend in ${formatCountdown(cooldown * 1000)}`
          : 'Resend email'}
      </Button>
      <a
        href={whatsappHref(
          site,
          `Hello, booking ${reference} was sent to the wrong email address.`,
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-brand inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
      >
        Wrong email? Contact us
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p
        role="status"
        aria-live="polite"
        className={`text-small basis-full font-medium ${state === 'failed' || state === 'limited' ? 'text-destructive' : ''}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {message && (
            <motion.span
              key={state}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
            >
              {message}
            </motion.span>
          )}
        </AnimatePresence>
      </p>
    </div>
  );
}

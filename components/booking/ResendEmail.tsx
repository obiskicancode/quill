'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { TextLink } from '@/components/ui/text-link';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useResendConfirmation } from '@/hooks/services/guest/use-booking';
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
  const resendConfirmation = useResendConfirmation();
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
      const r = await resendConfirmation.mutateAsync(reference);
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
      ? SUCCESS_MESSAGES.EMAIL_SENT
      : state === 'limited'
        ? ERROR_MESSAGES.WAIT_FOR_EMAIL
        : state === 'failed'
          ? ERROR_MESSAGES.COULD_NOT_SEND_EMAIL
          : '';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small">
      <p className="inline-flex items-center gap-2">
        <Mail className="size-4 text-brand-ink" aria-hidden />
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
      <TextLink
        href={whatsappHref(
          site,
          `Hello, booking ${reference} was sent to the wrong email address.`,
        )}
        external
      >
        Wrong email? Contact us
        <span className="sr-only"> (opens in a new tab)</span>
      </TextLink>
      <p
        role="status"
        aria-live="polite"
        className={`basis-full text-small font-medium ${state === 'failed' || state === 'limited' ? 'text-destructive' : ''}`}
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

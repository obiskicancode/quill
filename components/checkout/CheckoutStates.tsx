'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Clock, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { DateRange } from '@/types/dates.types';

import { DatePicker } from '../DatePicker';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';

type Tone = 'info' | 'warn' | 'danger';
const tones: Record<Tone, string> = {
  info: 'border-ink/40 bg-card',
  warn: 'border-primary bg-primary/15',
  danger: 'border-destructive bg-destructive/5',
};

export function Banner({
  tone,
  title,
  children,
  actions,
  role = 'status',
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  role?: 'status' | 'alert';
}) {
  return (
    <div role={role} className={`rounded-card border-2 p-5 ${tones[tone]}`}>
      <p className="font-semibold">{title}</p>
      {children && (
        <div className="text-small text-ink/85 mt-1">{children}</div>
      )}
      {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function PriceUpdatedPanel({
  previousMinor,
  currentMinor,
  onAccept,
  changeHref,
}: {
  previousMinor: number;
  currentMinor: number;
  onAccept: () => void;
  changeHref: string;
}) {
  const up = currentMinor > previousMinor;
  return (
    <Banner
      tone="warn"
      title="Price updated"
      actions={
        <>
          <Button onClick={onAccept}>Accept and continue</Button>
          <ButtonLink href={changeHref} variant="secondary">
            Change my stay
          </ButtonLink>
        </>
      }
    >
      <p>
        The total for your stay has {up ? 'gone up' : 'come down'} since you
        last looked: it was{' '}
        <span className="font-semibold line-through">
          {formatMinor(previousMinor)}
        </span>{' '}
        and is now{' '}
        <span className="font-semibold">{formatMinor(currentMinor)}</span>.
      </p>
    </Banner>
  );
}

export function NetworkErrorBanner({
  message,
  onRetry,
  busy,
}: {
  message: string;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <Banner
      role="alert"
      tone="danger"
      title="Something went wrong"
      actions={
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          icon={<RefreshCw className="size-4" aria-hidden />}
          onClick={onRetry}
        >
          Try again
        </Button>
      }
    >
      <p className="flex items-start gap-2">
        <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        {message} Trying again is safe: it will not create a second reservation
        or payment.
      </p>
    </Banner>
  );
}

export function ExpiringBanner() {
  return (
    <Banner tone="warn" title="Your hold ends in 2 minutes">
      <p>
        Finish your payment soon to keep this room. If the time runs out you can
        start again and we will re-check availability.
      </p>
    </Banner>
  );
}

export function ExpiredPanel({
  onRestart,
  busy,
}: {
  onRestart: () => void;
  busy: boolean;
}) {
  return (
    <Banner
      role="alert"
      tone="danger"
      title="Your hold on this room has expired"
      actions={
        <Button loading={busy} onClick={onRestart}>
          Start again
        </Button>
      }
    >
      <p>
        We have released the room. Start again and we will check availability
        for the same dates.
      </p>
    </Banner>
  );
}

interface UnavailableProps {
  room: { name: string; slug: string };
  stay: { checkIn: string; checkOut: string; adults: number; children: number };
  suggestions: { checkIn: string; checkOut: string; totalMinor: number }[];
  hrefFor: (range: { checkIn: string; checkOut: string }) => string;
  similarHref: string;
}

/** Full-width state when the room is gone. One-tap nearby dates, a date picker, and similar rooms. */
export function UnavailableState({
  room,
  stay,
  suggestions,
  hrefFor,
  similarHref,
}: UnavailableProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [range, setRange] = useState<DateRange>({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
  });
  const [picking, setPicking] = useState(false);
  return (
    <section
      aria-labelledby="unavailable-title"
      className="mx-auto max-w-3xl space-y-6"
    >
      <Banner
        role="alert"
        tone="danger"
        title="This room is no longer available for your dates"
      >
        <p>
          The {room.name} has been booked for{' '}
          {formatRange(stay.checkIn, stay.checkOut)}. Nothing has been charged.
        </p>
      </Banner>
      <h1 id="unavailable-title" className="font-display text-h2">
        Choose other dates
      </h1>
      {suggestions.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {suggestions.map((s) => (
            <li key={s.checkIn}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(hrefFor(s))}
                className="border-line bg-card hover:bg-primary hover:text-primary-foreground h-auto min-h-14 w-full flex-col items-start justify-center p-4 text-left font-normal transition-colors"
              >
                <span className="font-semibold">
                  {formatRange(s.checkIn, s.checkOut)}
                </span>
                <span className="text-small tabular-nums opacity-90">
                  {formatMinor(s.totalMinor)} total
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink/85">No nearby dates are free for this room.</p>
      )}
      <div>
        <Button
          variant="secondary"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
        >
          Pick different dates
        </Button>
        <AnimatePresence initial={false}>
          {picking && (
            <motion.div
              key="picker"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: EASE_OUT }}
              style={{ overflow: 'hidden' }}
              className="rounded-card border-line bg-card mt-4 max-w-sm border p-4"
            >
              <DatePicker
                value={range}
                onChange={(next) => {
                  setRange(next);
                  if (next.checkIn && next.checkOut)
                    router.push(
                      hrefFor({
                        checkIn: next.checkIn,
                        checkOut: next.checkOut,
                      }),
                    );
                }}
                monthsShown={1}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p>
        <ButtonLink href={similarHref} variant="secondary">
          See similar rooms
        </ButtonLink>
      </p>
    </section>
  );
}

export function ConfirmingScreen({
  timedOut,
  onCheckAgain,
  checking,
}: {
  timedOut: boolean;
  onCheckAgain: () => void;
  checking: boolean;
}) {
  const site = useSite();
  const reduced = useReducedMotion();
  return (
    <section
      aria-labelledby="confirming-title"
      className="rounded-card border-line bg-card shadow-raised border p-8 text-center"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!timedOut ? (
          <motion.div
            key="waiting"
            className="space-y-5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            <Loader2
              className="text-brand-ink mx-auto size-10 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            <h1 id="confirming-title" className="font-display text-h2">
              Confirming your payment
            </h1>
            <p role="status" className="text-ink/85 mx-auto max-w-md">
              Please keep this page open. We are waiting for your payment
              provider to confirm. This usually takes a few seconds.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="timed-out"
            className="space-y-5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            <Clock className="text-brand-ink mx-auto size-10" aria-hidden />
            <h1 id="confirming-title" className="font-display text-h2">
              We are still waiting for confirmation
            </h1>
            <p role="status" className="text-ink/85 mx-auto max-w-md">
              Your payment may still be going through. You do not need to pay
              again. We will email you as soon as it is confirmed. If you do not
              hear from us soon, contact the hotel on{' '}
              <a
                href={telHref(site)}
                className="font-semibold underline underline-offset-4"
              >
                {site.contact.phoneDisplay}
              </a>{' '}
              or{' '}
              <a
                href={whatsappHref(
                  site,
                  'Hello, I paid for a booking and have not received a confirmation.',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                WhatsApp<span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
            <Button
              variant="secondary"
              loading={checking}
              onClick={onCheckAgain}
            >
              Check again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function FailedPanel({
  reason,
  holdActive,
  onRetry,
  onSwitch,
  busy,
}: {
  reason: 'failed' | 'cancelled';
  holdActive: boolean;
  onRetry: () => void;
  onSwitch: () => void;
  busy: boolean;
}) {
  return (
    <Banner
      role="alert"
      tone="danger"
      title={
        reason === 'cancelled'
          ? 'You cancelled the payment'
          : "The payment didn't go through"
      }
      actions={
        <>
          <Button loading={busy} onClick={onRetry}>
            Try again
          </Button>
          <Button variant="secondary" onClick={onSwitch}>
            Use a different method
          </Button>
        </>
      }
    >
      <p>
        {reason === 'cancelled'
          ? 'The payment was stopped before it finished.'
          : 'The payment was not completed.'}{' '}
        {holdActive
          ? 'Your room is still held for you while the timer runs.'
          : ''}
      </p>
    </Banner>
  );
}

interface DoneProps {
  reference: string;
  confirmationHref: string;
}

export function TransferSubmittedScreen({
  reference,
  confirmationHref,
}: DoneProps) {
  return (
    <section
      aria-labelledby="transfer-title"
      className="rounded-card border-line bg-card shadow-raised space-y-5 border p-8"
    >
      <CheckCircle2 className="text-brand-ink size-10" aria-hidden />
      <h1 id="transfer-title" className="font-display text-h2">
        Reservation received, awaiting verification
      </h1>
      <p className="text-ink/85 max-w-xl">
        We have your transfer receipt. Your reservation is confirmed once the
        hotel verifies the transfer, and we will email you. Your booking
        reference is <span className="font-semibold">{reference}</span>.
      </p>
      <ButtonLink href={confirmationHref} size="lg">
        View your booking
      </ButtonLink>
    </section>
  );
}

export function RequestReceivedScreen({
  reference,
  confirmationHref,
  reason,
}: DoneProps & { reason: 'pay_at_hotel' | 'manual' }) {
  return (
    <section
      aria-labelledby="request-title"
      className="rounded-card border-line bg-card shadow-raised space-y-5 border p-8"
    >
      <CheckCircle2 className="text-brand-ink size-10" aria-hidden />
      <h1 id="request-title" className="font-display text-h2">
        Request received
      </h1>
      <p className="text-ink/85 max-w-xl">
        {reason === 'pay_at_hotel'
          ? 'We have reserved your room. You pay at the hotel when you arrive. The hotel will email you to confirm.'
          : 'The hotel reviews every booking and will email you once it is approved.'}{' '}
        Your booking reference is{' '}
        <span className="font-semibold">{reference}</span>.
      </p>
      <ButtonLink href={confirmationHref} size="lg">
        View your booking
      </ButtonLink>
    </section>
  );
}

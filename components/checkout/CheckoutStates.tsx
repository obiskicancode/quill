'use client';

/**
 * Checkout status panels: price changes, network failures, hold expiry,
 * payment confirmation and the terminal transfer/request states.
 */
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { SuccessMark } from '@/components/ui/icon-badge';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatCountdown, formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { DateRange } from '@/types/dates.types';

import { DatePicker } from '../DatePicker';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';
import { useHoldCountdown } from './useHoldCountdown';

/** Asks the guest to accept a server-side total change before continuing. */
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
    <Alert role="status" variant="warning" size="banner">
      <AlertTitle>{SUCCESS_MESSAGES.PRICE_UPDATED}</AlertTitle>
      <AlertDescription>
        <p>
          The total for your stay has {up ? 'gone up' : 'come down'} since you
          last looked: it was{' '}
          <span className="font-semibold line-through">
            {formatMinor(previousMinor)}
          </span>{' '}
          and is now{' '}
          <span className="font-semibold">{formatMinor(currentMinor)}</span>.
        </p>
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onAccept}>Accept and continue</Button>
        <ButtonLink href={changeHref} variant="secondary">
          Change my stay
        </ButtonLink>
      </div>
    </Alert>
  );
}

/** Retry banner that reassures the guest a retry cannot double-book. */
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
    <Alert role="alert" variant="destructive" size="banner">
      <AlertTitle>{ERROR_MESSAGES.SOMETHING_WENT_WRONG_TITLE}</AlertTitle>
      <AlertDescription>
        <p className="flex items-start gap-2">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message} Trying again is safe: it will not create a second
          reservation or payment.
        </p>
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          icon={<RefreshCw className="size-4" aria-hidden />}
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    </Alert>
  );
}

/** Warning shown when the room hold is close to expiring. */
export function ExpiringBanner() {
  return (
    <Alert role="status" variant="warning" size="banner">
      <AlertTitle>Your hold ends in 2 minutes</AlertTitle>
      <AlertDescription>
        <p>
          Finish your payment soon to keep this room. If the time runs out you
          can start again and we will re-check availability.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * The guest left mid-booking and the room is still held for them. Continuing hands
 * that hold back instead of taking a second one; changing something releases it and
 * starts a new attempt.
 */
export function PendingHoldBanner({
  reference,
  remainingMs,
  onContinue,
  onChange,
}: {
  reference: string;
  remainingMs: number | null;
  onContinue: () => void;
  onChange: () => void;
}) {
  return (
    <Alert role="status" variant="neutral" size="banner">
      <AlertTitle>You already have a room held for these dates</AlertTitle>
      <AlertDescription>
        <p>
          Booking <span className="font-semibold">{reference}</span> is still
          open and nothing has been charged yet.{' '}
          {remainingMs !== null && (
            <>
              <span className="tabular-nums">
                {formatCountdown(remainingMs)}
              </span>{' '}
              left.{' '}
            </>
          )}
          Continue to finish the payment, or change your details and we will
          release that hold and start again.
        </p>
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onContinue}>Continue this booking</Button>
        <Button variant="secondary" onClick={onChange}>
          Change something
        </Button>
      </div>
    </Alert>
  );
}

/**
 * A payment attempt failed while the room may still be held. Say how long the
 * guest has to try again, and say plainly when that time is gone — the two
 * states need different actions and the page cannot know which one is true at
 * render time.
 */
export function HoldRemainingNotice({
  expiresAtMs,
  serverNowMs,
}: {
  expiresAtMs: number;
  serverNowMs: number;
}) {
  const hold = useHoldCountdown(expiresAtMs, 0, serverNowMs);
  if (hold.remainingMs === null) return null;
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {hold.announcement}
      </p>
      <Alert
        role="status"
        variant={
          hold.expired ? 'destructive' : hold.expiring ? 'warning' : 'neutral'
        }
        size="panel"
      >
        <AlertTitle>
          {hold.expired
            ? 'This room has been released'
            : 'We are still holding this room'}
        </AlertTitle>
        <AlertDescription>
          <p>
            {hold.expired
              ? 'The hold ran out, so the room may be taken. Search your dates again and we will check availability before you pay anything.'
              : 'Nothing was charged. '}
            {!hold.expired && (
              <>
                You have{' '}
                <span className="font-semibold tabular-nums">
                  {formatCountdown(hold.remainingMs)}
                </span>{' '}
                left before we release it. Try the payment again, or choose bank
                transfer on the next step.
              </>
            )}
          </p>
        </AlertDescription>
      </Alert>
    </>
  );
}

/** Terminal panel for an expired hold, with a safe restart action. */
export function ExpiredPanel({
  onRestart,
  busy,
}: {
  onRestart: () => void;
  busy: boolean;
}) {
  return (
    <Alert role="alert" variant="destructive" size="banner">
      <AlertTitle>{ERROR_MESSAGES.HOLD_EXPIRED_TITLE}</AlertTitle>
      <AlertDescription>
        <p>
          We have released the room. Start again and we will check availability
          for the same dates.
        </p>
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button loading={busy} onClick={onRestart}>
          Start again
        </Button>
      </div>
    </Alert>
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
      <Alert role="alert" variant="destructive" size="banner">
        <AlertTitle>This room is no longer available for your dates</AlertTitle>
        <AlertDescription>
          <p>
            The {room.name} has been booked for{' '}
            {formatRange(stay.checkIn, stay.checkOut)}. Nothing has been
            charged.
          </p>
        </AlertDescription>
      </Alert>
      <h1 id="unavailable-title" className="font-display text-h2">
        Choose other dates
      </h1>
      {suggestions.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {suggestions.map((s) => (
            <li key={s.checkIn}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(hrefFor(s))}
                className="h-auto min-h-14 w-full flex-col items-start justify-center border-line bg-card p-4 text-left font-normal transition-colors hover:bg-primary hover:text-primary-foreground"
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
              className="mt-4 max-w-sm rounded-card border border-line bg-card p-4"
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

/** Full-screen waiting state while the provider payment is confirmed. */
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
    <Card
      render={<section aria-labelledby="confirming-title" />}
      className="gap-5 p-8 text-center text-body"
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
              className="mx-auto size-10 animate-spin text-brand-ink motion-reduce:animate-none"
              aria-hidden
            />
            <h1 id="confirming-title" className="font-display text-h2">
              Confirming your payment
            </h1>
            <p role="status" className="mx-auto max-w-md text-ink/85">
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
            <Clock className="mx-auto size-10 text-brand-ink" aria-hidden />
            <h1 id="confirming-title" className="font-display text-h2">
              We are still waiting for confirmation
            </h1>
            <p role="status" className="mx-auto max-w-md text-ink/85">
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
    </Card>
  );
}

/** Terminal panel for a failed or cancelled payment attempt. */
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
    <Alert role="alert" variant="destructive" size="banner">
      <AlertTitle>
        {reason === 'cancelled'
          ? 'You cancelled the payment'
          : "The payment didn't go through"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {reason === 'cancelled'
            ? 'The payment was stopped before it finished.'
            : 'The payment was not completed.'}{' '}
          {holdActive
            ? 'Your room is still held for you while the timer runs.'
            : ''}
        </p>
      </AlertDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button loading={busy} onClick={onRetry}>
          Try again
        </Button>
        <Button variant="secondary" onClick={onSwitch}>
          Use a different method
        </Button>
      </div>
    </Alert>
  );
}

interface DoneProps {
  reference: string;
  confirmationHref: string;
}

/** Confirmation that a bank-transfer proof was received and is awaiting review. */
export function TransferSubmittedScreen({
  reference,
  confirmationHref,
}: DoneProps) {
  return (
    <Card
      render={<section aria-labelledby="transfer-title" />}
      className="gap-5 p-8 text-body"
    >
      <SuccessMark />
      <h1 id="transfer-title" className="font-display text-h2">
        Reservation received, awaiting verification
      </h1>
      <p className="max-w-xl text-ink/85">
        We have your transfer receipt. Your reservation is confirmed once the
        hotel verifies the transfer, and we will email you. Your booking
        reference is <span className="font-semibold">{reference}</span>.
      </p>
      <ButtonLink href={confirmationHref} size="lg">
        View your booking
      </ButtonLink>
    </Card>
  );
}

/** Confirmation for pay-at-hotel or manual-approval requests. */
export function RequestReceivedScreen({
  reference,
  confirmationHref,
  reason,
}: DoneProps & { reason: 'pay_at_hotel' | 'manual' }) {
  return (
    <Card
      render={<section aria-labelledby="request-title" />}
      className="gap-5 p-8 text-body"
    >
      <SuccessMark />
      <h1 id="request-title" className="font-display text-h2">
        Request received
      </h1>
      <p className="max-w-xl text-ink/85">
        {reason === 'pay_at_hotel'
          ? 'We have reserved your room. You pay at the hotel when you arrive. The hotel will email you to confirm.'
          : 'The hotel reviews every booking and will email you once it is approved.'}{' '}
        Your booking reference is{' '}
        <span className="font-semibold">{reference}</span>.
      </p>
      <ButtonLink href={confirmationHref} size="lg">
        View your booking
      </ButtonLink>
    </Card>
  );
}

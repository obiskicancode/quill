'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useChangeDates,
  useChangeQuote,
} from '@/hooks/services/guest/use-manage';
import { formatDeadline, formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation } from '@/types/booking.types';
import type { DateRange } from '@/types/dates.types';
import type {
  ChangeQuoteResponse,
  PriceDifference,
} from '@/types/manage.types';

import { VerifyForm } from '../booking/VerifyForm';
import { Banner } from '../checkout/CheckoutStates';
import { DatePicker } from '../DatePicker';
import { EASE_OUT } from '../motion/variants';
import { PriceBreakdown } from '../room-detail/PriceBreakdown';
import { Button, ButtonLink } from '../ui/button';
import { ChangePayment } from './ChangePayment';
import { FlowDialog } from './FlowDialog';

interface ChangeDatesFlowProps {
  open: boolean;
  onClose: () => void;
  v: GuestReservation;
  csrf: string;
  onUpdated: (next: GuestReservation, message: string) => void;
  onRefresh: () => Promise<void>;
  sessionExpired: boolean;
  onSessionExpired: () => void;
  onReverified: () => void;
}

function describe(d: PriceDifference): { title: string; detail: string } {
  if (d.kind === 'pay') {
    return d.settle === 'now'
      ? {
          title: `Pay ${formatMinor(d.amountMinor)} more`,
          detail:
            'You pay the difference now. We hold your new dates while you pay, and your current dates stay valid until the payment is complete.',
        }
      : {
          title: `Your balance due at the hotel goes up by ${formatMinor(d.amountMinor)}`,
          detail: 'Nothing to pay online today.',
        };
  }
  if (d.kind === 'refund') {
    return d.settle === 'now'
      ? {
          title: `Refund ${formatMinor(d.amountMinor)}`,
          detail: `Returned to ${d.refundMethod === 'manual_bank' ? 'your bank by the hotel' : 'your original payment method'}, expected within ${d.timeline}.`,
        }
      : {
          title: `Your balance due at the hotel goes down by ${formatMinor(d.amountMinor)}`,
          detail:
            'Nothing is refunded online because you have not paid that part yet.',
        };
  }
  return { title: 'No price difference', detail: 'Your total stays the same.' };
}

/** Pick new dates, see the server's quote for the same room type, then confirm. Safe to retry. */
export function ChangeDatesFlow({
  open,
  onClose,
  v,
  csrf,
  onUpdated,
  onRefresh,
  sessionExpired,
  onSessionExpired,
  onReverified,
}: ChangeDatesFlowProps) {
  const site = useSite();
  const current: DateRange = {
    checkIn: v.stay.checkIn,
    checkOut: v.stay.checkOut,
  };
  const changeQuote = useChangeQuote();
  const changeDates = useChangeDates();
  const [step, setStep] = useState<'pick' | 'payment' | 'done'>('pick');
  const [range, setRange] = useState<DateRange>(current);
  const [quote, setQuote] = useState<ChangeQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ChangeQuoteResponse | null>(null);
  const [key, setKey] = useState(() => newKey());

  // Reset the flow each time the dialog opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setStep(v.manage?.pendingChange ? 'payment' : 'pick');
      setRange(current);
      setQuote(null);
      setQuoteFailed(false);
      setError(null);
      setNotice(null);
      setConfirmed(null);
      setKey(newKey());
    }
  }
  const pending = v.manage?.pendingChange ?? null;
  const reduced = useReducedMotion();
  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: EASE_OUT },
      };

  async function runQuote(r: DateRange) {
    if (!r.checkIn || !r.checkOut) return;
    setQuoting(true);
    setQuoteFailed(false);
    setError(null);
    try {
      setQuote(
        await changeQuote.mutateAsync({
          reference: v.reference,
          body: { checkIn: r.checkIn, checkOut: r.checkOut },
          csrf,
        }),
      );
    } catch (e) {
      if (
        e instanceof ServiceError &&
        e.body?.code === ERROR_CODES.SESSION_EXPIRED
      )
        onSessionExpired();
      else setQuoteFailed(true);
    } finally {
      setQuoting(false);
    }
  }

  // Quote when a new full range is picked; the range-changing handlers below call it.
  function isCurrentRange(r: DateRange) {
    return r.checkIn === current.checkIn && r.checkOut === current.checkOut;
  }

  function pickRange(r: DateRange) {
    setRange(r);
    setQuote(null);
    setNotice(null);
    if (r.checkIn && r.checkOut && !isCurrentRange(r)) void runQuote(r);
  }

  async function confirm() {
    if (busy || quote?.status !== 'ok') return;
    setBusy(true);
    setError(null);
    try {
      const res = await changeDates.mutateAsync({
        reference: v.reference,
        body: { idempotencyKey: key, quoteId: quote.quoteId },
        csrf,
      });
      setConfirmed(quote);
      onUpdated(
        res.view,
        res.status === 'completed'
          ? SUCCESS_MESSAGES.DATES_CHANGED
          : SUCCESS_MESSAGES.NEW_DATES_HELD,
      );
      setStep(res.status === 'completed' ? 'done' : 'payment');
    } catch (e) {
      const f = e instanceof ServiceError ? e : null;
      const stale = (
        f?.body as unknown as { quote?: ChangeQuoteResponse } | null
      )?.quote;
      if (f?.body?.code === ERROR_CODES.SESSION_EXPIRED) onSessionExpired();
      else if (f?.body?.code === ERROR_CODES.QUOTE_STALE && stale) {
        setKey(newKey());
        setQuote(stale);
        setNotice(ERROR_MESSAGES.QUOTE_CHANGED_REVIEW);
      } else if (!f || f.network || f.status >= 500) {
        setError({
          message: ERROR_MESSAGES.COULD_NOT_REACH_SERVER_CHANGE_UNKNOWN,
          retryable: true,
        });
      } else {
        setKey(newKey());
        setError({
          message: f.body?.message ?? ERROR_MESSAGES.COULD_NOT_CHANGE_DATES,
          retryable: false,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const askHotel = (extra: string) =>
    whatsappHref(
      site,
      `Hello, I'd like to change booking ${v.reference}${range.checkIn && range.checkOut ? ` to ${formatRange(range.checkIn, range.checkOut)}` : ''}. ${extra}`,
    );
  const currentLabel =
    current.checkIn && current.checkOut
      ? formatRange(current.checkIn, current.checkOut)
      : '';
  const quoteKey = quoting
    ? 'quoting'
    : quoteFailed
      ? 'failed'
      : (quote?.status ?? 'idle');

  let body: React.ReactNode;
  if (sessionExpired) {
    body = (
      <VerifyForm
        embedded
        scope="manage"
        variant="verify"
        reference={v.reference}
        notice={ERROR_MESSAGES.SESSION_ENDED_VERIFY_CONTINUE_DATES}
        onVerified={onReverified}
      />
    );
  } else if (step === 'done') {
    const refund =
      confirmed?.status === 'ok' && confirmed.difference.kind === 'refund'
        ? describe(confirmed.difference)
        : null;
    body = (
      <div className="space-y-5">
        <div role="status" className="flex items-start gap-4">
          <CheckCircle2
            className="text-brand-ink size-8 shrink-0"
            aria-hidden
          />
          <div>
            <p className="font-display text-h3">Your dates are changed</p>
            <p className="text-ink/85 mt-2">
              You are now booked for{' '}
              <span className="font-semibold">
                {v.stay.checkIn && v.stay.checkOut
                  ? formatRange(v.stay.checkIn, v.stay.checkOut)
                  : ''}
              </span>
              .
            </p>
            {refund && (
              <p className="text-small mt-2">
                {refund.title}. {refund.detail}
              </p>
            )}
            <p className="text-small text-muted-foreground mt-2">
              We emailed your updated booking to {v.guest.email}.
            </p>
          </div>
        </div>
        <Button size="lg" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  } else if (step === 'payment' && pending) {
    body = (
      <ChangePayment
        reference={v.reference}
        change={pending}
        csrf={csrf}
        onRefresh={onRefresh}
        onSessionExpired={onSessionExpired}
      />
    );
  } else {
    body = (
      <div className="space-y-5">
        <p className="text-ink/85">
          Current dates: <span className="font-semibold">{currentLabel}</span>.
          Pick your new check-in and check-out. You can change dates online{' '}
          {v.manage?.allowed.changesRemaining ?? 0} more{' '}
          {v.manage?.allowed.changesRemaining === 1 ? 'time' : 'times'}.
        </p>
        <div className="rounded-card border-line bg-card max-w-sm border p-3">
          <DatePicker
            value={range}
            onChange={(r) => pickRange(r)}
            monthsShown={1}
          />
        </div>

        <div aria-live="polite" className="space-y-4">
          {notice && (
            <Banner tone="warn" title="Please review">
              <p>{notice}</p>
            </Banner>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={quoteKey} {...panelMotion} className="space-y-4">
              {quoting && (
                <div aria-busy="true" role="status">
                  <p className="sr-only">Checking your new dates</p>
                  <div aria-hidden className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-ink/10 h-8 rounded motion-safe:animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              )}
              {quoteFailed && (
                <Banner
                  role="alert"
                  tone="danger"
                  title={ERROR_MESSAGES.COULD_NOT_CHECK_DATES}
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void runQuote(range)}
                    >
                      Try again
                    </Button>
                  }
                >
                  <p>
                    Your booking has not changed. This only checks prices, so
                    trying again is safe.
                  </p>
                </Banner>
              )}

              {!quoting && quote?.status === 'ok' && (
                <div className="space-y-4">
                  <div className="rounded-card border-ink border-2 p-4">
                    <p className="text-small text-muted-foreground">
                      New dates
                    </p>
                    <p className="font-semibold">
                      {formatRange(quote.checkIn, quote.checkOut)} (
                      {quote.nights} {quote.nights === 1 ? 'night' : 'nights'})
                    </p>
                    <p className="font-display text-h3 mt-3">
                      {describe(quote.difference).title}
                    </p>
                    <p className="text-small text-ink/85 mt-1">
                      {describe(quote.difference).detail}
                    </p>
                    <p className="text-small text-muted-foreground mt-3">
                      New total {formatMinor(quote.newTotalMinor)}, was{' '}
                      {formatMinor(quote.oldTotalMinor)}.
                    </p>
                  </div>
                  {quote.roomReassigned && (
                    <Banner tone="info" title="Your room may change">
                      <p>
                        The same room is taken for these dates, so we will give
                        you another room of the same type.
                      </p>
                    </Banner>
                  )}
                  <p className="rounded-control bg-paper text-small p-3 font-semibold">
                    {quote.newPolicy.nonRefundable
                      ? 'Non-refundable'
                      : quote.newPolicy.freeCancellationUntil
                        ? `Free cancellation until ${formatDeadline(quote.newPolicy.freeCancellationUntil)}`
                        : 'The free cancellation window has ended for these dates.'}
                  </p>
                  <details className="rounded-control border-line border p-3">
                    <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                      See the new price breakdown
                    </summary>
                    <div className="pt-2">
                      <PriceBreakdown quote={quote.breakdown} />
                    </div>
                  </details>
                  {error && (
                    <Banner
                      role="alert"
                      tone="danger"
                      title={ERROR_MESSAGES.DATES_NOT_CHANGED_YET}
                      actions={
                        error.retryable ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busy}
                            onClick={() => void confirm()}
                          >
                            Try again
                          </Button>
                        ) : undefined
                      }
                    >
                      <p>{error.message}</p>
                    </Banner>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      loading={busy}
                      onClick={() => void confirm()}
                    >
                      Confirm new dates
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setRange(current);
                        setQuote(null);
                      }}
                    >
                      Choose other dates
                    </Button>
                  </div>
                </div>
              )}

              {!quoting && quote?.status === ERROR_CODES.UNAVAILABLE && (
                <div className="space-y-4">
                  <Banner
                    role="alert"
                    tone="danger"
                    title="Those dates aren't available"
                  >
                    <p>
                      Your room type is booked for{' '}
                      {range.checkIn && range.checkOut
                        ? formatRange(range.checkIn, range.checkOut)
                        : 'those dates'}
                      .
                    </p>
                  </Banner>
                  {quote.suggestions.length > 0 && (
                    <ul className="grid gap-3 sm:grid-cols-3">
                      {quote.suggestions.map((s) => (
                        <li key={s.checkIn}>
                          <Button
                            variant="outline"
                            className="h-auto min-h-14 w-full flex-col items-start justify-center px-4 text-left font-normal"
                            onClick={() =>
                              pickRange({
                                checkIn: s.checkIn,
                                checkOut: s.checkOut,
                              })
                            }
                          >
                            <span className="font-semibold">
                              {formatRange(s.checkIn, s.checkOut)}
                            </span>
                            <span className="text-small text-muted-foreground tabular-nums">
                              {formatMinor(s.totalMinor)} total
                            </span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ButtonLink
                    href={askHotel('Could you check other dates for me?')}
                    external
                    variant="secondary"
                  >
                    Ask the hotel
                    <span className="sr-only"> (opens in a new tab)</span>
                  </ButtonLink>
                </div>
              )}

              {!quoting && quote?.status === 'rule' && (
                <Banner
                  role="alert"
                  tone="danger"
                  title={ERROR_MESSAGES.DATES_CANNOT_BE_USED}
                >
                  <ul className="list-disc space-y-1 pl-5">
                    {quote.violations.map((x) => (
                      <li key={x.message}>{x.message}</li>
                    ))}
                  </ul>
                </Banner>
              )}

              {!quoting && quote?.status === 'not_allowed' && (
                <Banner
                  role="alert"
                  tone="warn"
                  title={ERROR_MESSAGES.DATES_CANNOT_CHANGE_ONLINE_TITLE}
                  actions={
                    <ButtonLink
                      href={askHotel('Please can you help?')}
                      external
                      variant="secondary"
                      size="sm"
                    >
                      Ask the hotel on WhatsApp
                      <span className="sr-only"> (opens in a new tab)</span>
                    </ButtonLink>
                  }
                >
                  <p>{quote.reason}</p>
                </Banner>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <FlowDialog
      open={open}
      onClose={onClose}
      title={step === 'done' ? 'Dates changed' : 'Change dates'}
      dismissible={!busy}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sessionExpired ? 'expired' : step} {...panelMotion}>
          {body}
        </motion.div>
      </AnimatePresence>
    </FlowDialog>
  );
}

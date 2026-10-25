'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { bookingService } from '@/app/api/services/booking.service';
import { trackBookingConfirmedOnce } from '@/lib/booking/analytics';
import { headerKind, type GuestReservation } from '@/types/booking.types';

import { Banner } from '../checkout/CheckoutStates';
import { HelpBlock } from '../HelpBlock';
import { Reveal } from '../motion';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/Button';
import { ActionRow } from './ActionRow';
import { AddExtrasStrip } from './AddExtrasStrip';
import { GettingHere } from './GettingHere';
import { NextSteps } from './NextSteps';
import { PaymentSummary } from './PaymentSummary';
import { PolicySection } from './PolicySection';
import { PrintVoucher } from './PrintVoucher';
import { ResendEmail } from './ResendEmail';
import { StatusHeader } from './StatusHeader';
import { StayDetailsCard } from './StayDetailsCard';
import { TransferPanel } from './TransferPanel';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

const emailLead = {
  confirmed: 'A confirmation was sent to',
  'confirmed-deposit': 'A confirmation was sent to',
  confirming: 'We will email your confirmation to',
  transfer: 'We emailed your booking details to',
  approval: 'We emailed your booking details to',
  'pay-at-hotel': 'We emailed your booking details to',
  ended: '',
} as const;

/**
 * The confirmation page. The top block always follows the real status and never says "confirmed" early.
 * While a payment is still being verified it polls the status endpoint and updates in place.
 */
export function ConfirmationView({ initial }: { initial: GuestReservation }) {
  const [v, setV] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const kind = headerKind(v);
  const reduced = useReducedMotion();
  const presence = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };
  const presenceTransition = { duration: reduced ? 0 : 0.22, ease: EASE_OUT };

  /** A read-only reload. Retrying it can never change the reservation. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(false);
    try {
      const next = (await bookingService.get(v.reference)).data;
      setV((prev) => {
        if (prev.status !== next.status)
          setAnnouncement(
            'Your booking status has changed. The page has been updated.',
          );
        return next;
      });
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [v.reference]);

  // Poll while the payment is being verified.
  useEffect(() => {
    if (kind !== 'confirming') return;
    let stopped = false;
    let timer: number | undefined;
    const started = Date.now();
    const tick = async () => {
      try {
        const s = (await bookingService.status(v.reference)).data;
        if (stopped) return;
        if (s.status !== v.status || s.paymentStatus !== v.paymentStatus)
          return void (await refresh());
      } catch {
        /* keep polling until the timeout */
      }
      if (stopped) return;
      if (Date.now() - started > POLL_TIMEOUT_MS) return setTimedOut(true);
      timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, v.status, v.paymentStatus, pollNonce]);

  // Once, and never from a reload: no personal data in the event.
  useEffect(() => {
    if (v.status === 'confirmed')
      trackBookingConfirmedOnce(
        v.reference,
        v.amounts.paidMinor || v.amounts.totalMinor,
      );
  }, [v.status, v.reference, v.amounts.paidMinor, v.amounts.totalMinor]);

  const active = kind !== 'ended';

  return (
    <div className="confirmation-page">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="container-page max-w-5xl space-y-8 py-8 md:py-12 print:hidden">
        <StatusHeader v={v} kind={kind} timedOut={timedOut}>
          {kind === 'transfer' && (
            <TransferPanel v={v} onUploaded={() => void refresh()} />
          )}
          {kind === 'confirming' && timedOut && (
            <Button
              variant="secondary"
              loading={refreshing}
              onClick={() => {
                setTimedOut(false);
                setPollNonce((n) => n + 1);
              }}
            >
              Check again
            </Button>
          )}
        </StatusHeader>

        <AnimatePresence initial={false}>
          {refreshError && (
            <motion.div
              key="refresh-error"
              {...presence}
              transition={presenceTransition}
            >
              <Banner
                role="alert"
                tone="danger"
                title="We couldn't refresh your booking"
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={refreshing}
                    onClick={() => void refresh()}
                  >
                    Try again
                  </Button>
                }
              >
                <p>
                  Your booking is safe. This only reloads what you see, so
                  trying again changes nothing.
                </p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {active && (
            <motion.div
              key="resend-email"
              {...presence}
              transition={presenceTransition}
            >
              <ResendEmail
                reference={v.reference}
                maskedEmail={v.guest.email}
                lead={emailLead[kind]}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Reveal delay={0.05}>
          <ActionRow v={v} />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <StayDetailsCard v={v} />
            <PaymentSummary v={v} />
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <NextSteps v={v} kind={kind} />
        </Reveal>
        <AnimatePresence initial={false}>
          {active && (
            <motion.div
              key="getting-here"
              {...presence}
              transition={presenceTransition}
            >
              <GettingHere hotel={v.hotel} />
            </motion.div>
          )}
        </AnimatePresence>
        <Reveal delay={0.2}>
          <PolicySection v={v} />
        </Reveal>
        <Reveal delay={0.24}>
          <AddExtrasStrip v={v} />
        </Reveal>
      </div>

      <div className="print:hidden">
        <HelpBlock
          title={
            active
              ? 'Need to change something?'
              : 'Need help with this booking?'
          }
          text="Dates, guests, a late arrival or a question: message us or call and we will sort it."
          message={`Hello ${v.hotel.name}, I need help with booking ${v.reference}.`}
        >
          {active && (
            <ButtonLink
              href={`/booking/manage?ref=${encodeURIComponent(v.reference)}`}
              variant="secondary"
              icon={<Settings2 className="size-5" aria-hidden />}
            >
              Manage booking
            </ButtonLink>
          )}
        </HelpBlock>
        <div className="h-16" aria-hidden />
      </div>

      <PrintVoucher v={v} />
    </div>
  );
}

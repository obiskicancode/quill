'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  useGuestBooking,
  useGuestBookingStatus,
} from '@/hooks/services/guest/use-booking';
import { trackBookingConfirmedOnce } from '@/lib/booking/analytics';
import { headerKind } from '@/lib/booking/status';
import type { GuestReservation } from '@/types/booking.types';

import { HelpBlock } from '../HelpBlock';
import { Reveal } from '../motion';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';
import { ActionRow } from './ActionRow';
import { AddExtrasStrip } from './AddExtrasStrip';
import { BookingDoc } from './BookingDoc';
import { GettingHere } from './GettingHere';
import { NextSteps } from './NextSteps';
import { PaymentSummary } from './PaymentSummary';
import { PolicySection } from './PolicySection';
import { PrintVoucher } from './PrintVoucher';
import { ResendEmail } from './ResendEmail';
import { StatusHeader } from './StatusHeader';
import { StayDetailsCard } from './StayDetailsCard';
import { TransferPanel } from './TransferPanel';

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
  const bookingQuery = useGuestBooking(initial.reference, initial);
  const { refetch } = bookingQuery;
  const booking = bookingQuery.data;
  const [timedOut, setTimedOut] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const detailKind = headerKind(booking);
  const statusQuery = useGuestBookingStatus(
    booking.reference,
    detailKind === 'confirming' && !timedOut,
  );
  const reduced = useReducedMotion();
  const presence = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };
  const presenceTransition = { duration: reduced ? 0 : 0.22, ease: EASE_OUT };
  /**
   * One source for the page: the detail, overlaid with the polled status, so the
   * header follows the payment as soon as the poll sees it.
   */
  const v = useMemo(
    () =>
      statusQuery.data
        ? {
            ...booking,
            status: statusQuery.data.status,
            paymentStatus: statusQuery.data.paymentStatus,
          }
        : booking,
    [booking, statusQuery.data],
  );
  const kind = headerKind(v);
  /** A read-only reload. Retrying it can never change the reservation. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(false);
    const before = v;
    try {
      const result = await refetch();
      if (result.error) throw result.error;
      if (result.data && result.data.status !== before.status)
        setAnnouncement(ERROR_MESSAGES.BOOKING_STATUS_CHANGED);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, v]);
  useEffect(() => {
    if (kind !== 'confirming' || timedOut) return;
    const timer = window.setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [kind, timedOut]);
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
    <BookingDoc
      announcement={announcement}
      status={
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
                void refetch();
                void statusQuery.refetch();
              }}
            >
              Check again
            </Button>
          )}
        </StatusHeader>
      }
      notices={
        <AnimatePresence initial={false}>
          {refreshError && (
            <motion.div
              key="refresh-error"
              {...presence}
              transition={presenceTransition}
            >
              <Alert role="alert" variant="destructive" size="banner">
                <AlertTitle>
                  {ERROR_MESSAGES.COULD_NOT_REFRESH_BOOKING}
                </AlertTitle>
                <AlertDescription>
                  <p>
                    Your booking is safe. This only reloads what you see, so
                    trying again changes nothing.
                  </p>
                </AlertDescription>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={refreshing}
                    onClick={() => void refresh()}
                  >
                    Try again
                  </Button>
                </div>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      }
      actions={
        <>
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
        </>
      }
      facts={
        <Reveal delay={0.1}>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <StayDetailsCard v={v} />
            <PaymentSummary v={v} />
          </div>
        </Reveal>
      }
      story={
        <Reveal delay={0.15}>
          <NextSteps v={v} kind={kind} />
        </Reveal>
      }
      reference={
        <>
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
        </>
      }
      help={
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
      }
      print={<PrintVoucher v={v} />}
    />
  );
}

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { manageService } from '@/app/api/services/manage.service';
import type { CancelRequest } from '@/schemas/manage.schema';
import type { GuestReservation } from '@/types/booking.types';
import { CANCEL_REASONS, type CancellationPreview } from '@/types/manage.types';
import { formatMinor } from '@/types/stay.types';

import { VerifyForm } from '../booking/VerifyForm';
import { Banner } from '../checkout/CheckoutStates';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/Button';
import { FlowDialog } from './FlowDialog';

interface CancelFlowProps {
  open: boolean;
  onClose: () => void;
  v: GuestReservation;
  csrf: string;
  onUpdated: (next: GuestReservation, message: string) => void;
  sessionExpired: boolean;
  onSessionExpired: () => void;
  onReverified: () => void;
}

const kindNote: Record<
  CancellationPreview['kind'],
  (p: CancellationPreview) => string
> = {
  free: () =>
    'Free cancellation applies, so everything you paid comes back to you.',
  partial: () => 'Part of your payment is kept under the cancellation policy.',
  non_refundable: () =>
    'Nothing is refunded. You can still cancel if you no longer need the room.',
  deposit_only: () =>
    'You have only paid a deposit. The balance is not charged if you cancel.',
  pay_at_hotel: () =>
    'You have not paid anything online, so nothing is refunded and nothing is charged.',
  unpaid: () =>
    'No payment has been received yet, so nothing is refunded and nothing is charged.',
  bank_transfer: (p) =>
    `You paid by bank transfer, so the hotel refunds you by hand. Expect it in ${p.timeline}.`,
};

function RefundSummary({ p }: { p: CancellationPreview }) {
  const row = 'flex items-baseline justify-between gap-4 py-2';
  return (
    <div className="space-y-4">
      <dl className="divide-line rounded-card border-line bg-surface divide-y border px-4">
        <div className={row}>
          <dt className="text-muted">You paid</dt>
          <dd className="tabular-nums">{formatMinor(p.paidMinor)}</dd>
        </div>
        <div className={row}>
          <dt className="font-semibold">You would get back</dt>
          <dd className="font-display text-xl tabular-nums">
            {formatMinor(p.refundMinor)}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-muted">The hotel would keep</dt>
          <dd className="tabular-nums">{formatMinor(p.retainedMinor)}</dd>
        </div>
        {p.refundMinor > 0 && (
          <>
            <div className={row}>
              <dt className="text-muted">Refund method</dt>
              <dd>
                {p.refundMethod === 'manual_bank'
                  ? 'Bank transfer by the hotel'
                  : 'Your original payment method'}
              </dd>
            </div>
            <div className={row}>
              <dt className="text-muted">Expected within</dt>
              <dd>{p.timeline}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="rounded-control bg-paper text-small p-4">
        <p className="font-semibold">Why: {p.rule}</p>
        <p className="text-ink/85 mt-1">{kindNote[p.kind](p)}</p>
      </div>
    </div>
  );
}

/** Cancel in three steps: see the consequences, give an optional reason and confirm, then the result. Safe to retry. */
export function CancelFlow({
  open,
  onClose,
  v,
  csrf,
  onUpdated,
  sessionExpired,
  onSessionExpired,
  onReverified,
}: CancelFlowProps) {
  const [step, setStep] = useState<'review' | 'confirm' | 'done'>('review');
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [ackError, setAckError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [result, setResult] = useState<GuestReservation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const key = useRef(newKey());
  const reduced = useReducedMotion();
  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: EASE_OUT },
      };

  async function loadPreview() {
    setLoadState('loading');
    try {
      setPreview((await manageService.cancellationPreview(v.reference)).data);
      setLoadState('ready');
    } catch (e) {
      if (e instanceof ServiceError && e.body?.code === 'session_expired')
        onSessionExpired();
      setLoadState('error');
    }
  }

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the flow each time the dialog opens
    setStep('review');
    setReason('');
    setNote('');
    setAck(false);
    setAckError(false);
    setError(null);
    setResult(null);
    setNotice(null);
    key.current = newKey();
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (busy || !preview) return;
    if (!ack) return setAckError(true);
    setAckError(false);
    setError(null);
    setBusy(true);
    try {
      const next = (
        await manageService.cancel(
          v.reference,
          {
            idempotencyKey: key.current,
            reason: (reason || null) as CancelRequest['reason'],
            note: note.trim() || null,
            acknowledged: true,
            expectedRefundMinor: preview.refundMinor,
          },
          csrf,
        )
      ).data;
      setResult(next);
      setStep('done');
      onUpdated(next, 'Your booking has been cancelled.');
    } catch (e) {
      const f = e instanceof ServiceError ? e : null;
      if (f?.body?.code === 'session_expired') onSessionExpired();
      else if (f?.body?.code === 'preview_changed' && f.body.preview) {
        key.current = newKey();
        setPreview(f.body.preview as CancellationPreview);
        setStep('review');
        setNotice(
          'The refund amount has changed since you opened this. Please review it before you continue.',
        );
      } else if (!f || f.network || f.status >= 500) {
        setError({
          message:
            "We couldn't reach the server, so we don't know if the cancellation went through. Trying again is safe: it will not cancel twice or refund twice.",
          retryable: true,
        });
      } else {
        key.current = newKey();
        setError({
          message: f.body?.message ?? 'We could not cancel this booking.',
          retryable: false,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const c = result?.cancellation;
  const panelKey = sessionExpired
    ? 'expired'
    : step === 'done' && result
      ? 'done'
      : loadState === 'loading'
        ? 'loading'
        : loadState === 'error' || !preview
          ? 'error'
          : step;
  return (
    <FlowDialog
      open={open}
      onClose={onClose}
      title={step === 'done' ? 'Booking cancelled' : 'Cancel booking'}
      dismissible={!busy}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={panelKey} {...panelMotion}>
          {sessionExpired ? (
            <VerifyForm
              embedded
              scope="manage"
              variant="verify"
              reference={v.reference}
              notice="Your session ended. Verify again to continue. Nothing you entered here is lost."
              onVerified={onReverified}
            />
          ) : step === 'done' && result ? (
            <div className="space-y-5">
              <div role="status" className="flex items-start gap-4">
                <CheckCircle2
                  className="text-accent-ink size-8 shrink-0"
                  aria-hidden
                />
                <div>
                  <p className="font-display text-h3">
                    Your booking is cancelled
                  </p>
                  <p className="text-ink/85 mt-2">
                    {c?.refundStatus === 'initiated' &&
                      `We've started a refund of ${formatMinor(c.refundMinor)} to your original payment method. Expect it within ${c.timeline}.`}
                    {c?.refundStatus === 'pending_manual' &&
                      `The hotel will refund ${formatMinor(c.refundMinor)} to your bank by transfer. Expect it within ${c.timeline}. They may contact you for your account details.`}
                    {c?.refundStatus === 'none' &&
                      'No refund is due under the cancellation policy.'}
                  </p>
                  <p className="text-small text-muted mt-2">
                    We emailed a confirmation to {result.guest.email}.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  href={
                    v.stay.checkIn && v.stay.checkOut
                      ? `/checkout?${new URLSearchParams({ room: v.room.slug, checkIn: v.stay.checkIn, checkOut: v.stay.checkOut, adults: String(v.stay.adults), children: String(v.stay.children) }).toString()}`
                      : `/rooms/${v.room.slug}`
                  }
                  size="lg"
                >
                  Book again
                </ButtonLink>
                <Button variant="secondary" size="lg" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : loadState === 'loading' ? (
            <div aria-busy="true" role="status" className="space-y-3">
              <p className="sr-only">Working out your refund</p>
              <div aria-hidden className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-ink/10 h-10 rounded motion-safe:animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : loadState === 'error' || !preview ? (
            <Banner
              role="alert"
              tone="danger"
              title="We couldn't work out your refund"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadPreview()}
                >
                  Try again
                </Button>
              }
            >
              <p>Nothing has been changed. Try again, or contact the hotel.</p>
            </Banner>
          ) : step === 'review' ? (
            <div className="space-y-5">
              {notice && (
                <Banner
                  role="alert"
                  tone="warn"
                  title="Please review the new amount"
                >
                  <p>{notice}</p>
                </Banner>
              )}
              <p className="text-ink/85">
                Here is exactly what happens if you cancel. Nothing is changed
                until you confirm.
              </p>
              <RefundSummary p={preview} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="secondary" onClick={onClose}>
                  Keep my booking
                </Button>
                <Button
                  size="lg"
                  variant="dark"
                  onClick={() => {
                    setNotice(null);
                    setStep('confirm');
                  }}
                >
                  Continue to cancel
                </Button>
              </div>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="space-y-5"
            >
              <p className="rounded-control bg-paper text-small p-4">
                You will get back{' '}
                <span className="font-semibold">
                  {formatMinor(preview.refundMinor)}
                </span>
                . The hotel keeps{' '}
                <span className="font-semibold">
                  {formatMinor(preview.retainedMinor)}
                </span>
                .
              </p>
              <div>
                <label
                  htmlFor="cancel-reason"
                  className="text-small mb-1.5 block font-semibold"
                >
                  Reason{' '}
                  <span className="text-muted font-normal">(optional)</span>
                </label>
                <select
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-control border-ink/60 bg-surface min-h-12 w-full border px-4"
                >
                  <option value="">Choose a reason</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="cancel-note"
                  className="text-small mb-1.5 block font-semibold"
                >
                  Anything you would like to add{' '}
                  <span className="text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  id="cancel-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={3}
                  aria-describedby="cancel-note-count"
                  className="rounded-control border-ink/60 bg-surface w-full border px-4 py-3"
                />
                <p
                  id="cancel-note-count"
                  className="text-caption text-muted mt-1"
                >
                  {note.length} / 300 characters
                </p>
              </div>
              <div>
                <label className="flex cursor-pointer items-start gap-3 py-1">
                  <input
                    id="cancel-ack"
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => {
                      setAck(e.target.checked);
                      if (e.target.checked) setAckError(false);
                    }}
                    aria-invalid={ackError || undefined}
                    aria-describedby={ackError ? 'cancel-ack-error' : undefined}
                    className="accent-ink mt-0.5 size-6 shrink-0"
                  />
                  <span className="text-small">
                    I understand this cannot be undone.
                  </span>
                </label>
                {ackError && (
                  <p
                    id="cancel-ack-error"
                    className="text-small text-danger mt-1.5 font-medium"
                  >
                    Please confirm that you understand this cannot be undone.
                  </p>
                )}
              </div>

              {error && (
                <Banner
                  role="alert"
                  tone="danger"
                  title="The booking was not cancelled yet"
                  actions={
                    error.retryable ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() => void submit()}
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
                  variant="secondary"
                  size="lg"
                  disabled={busy}
                  onClick={() => setStep('review')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="lg"
                  loading={busy}
                  icon={
                    busy ? (
                      <Loader2 className="hidden" aria-hidden />
                    ) : undefined
                  }
                >
                  Cancel booking
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </FlowDialog>
  );
}

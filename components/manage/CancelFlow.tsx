'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SuccessMark } from '@/components/ui/icon-badge';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { CANCEL_REASONS } from '@/constants/manage';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCancelBooking,
  useCancellationPreview,
} from '@/hooks/services/guest/use-manage';
import { formatMinor } from '@/lib/format';
import {
  cancelRequestSchema,
  type CancelRequest,
} from '@/schemas/manage.schema';
import type { GuestReservation } from '@/types/booking.types';
import type { CancellationPreview } from '@/types/manage.types';

import { VerifyForm } from '../booking/VerifyForm';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { FlowDialog } from './FlowDialog';

const cancelFormSchema = cancelRequestSchema.pick({
  reason: true,
  note: true,
  acknowledged: true,
});
type CancelFormInput = z.input<typeof cancelFormSchema>;
type CancelFormOutput = z.output<typeof cancelFormSchema>;
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
      <dl className="divide-y divide-line rounded-card border border-line bg-card px-4">
        <div className={row}>
          <dt className="text-muted-foreground">You paid</dt>
          <dd className="tabular-nums">{formatMinor(p.paidMinor)}</dd>
        </div>
        <div className={row}>
          <dt className="font-semibold">You would get back</dt>
          <dd className="font-display text-figure-sm tabular-nums">
            {formatMinor(p.refundMinor)}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">The hotel would keep</dt>
          <dd className="tabular-nums">{formatMinor(p.retainedMinor)}</dd>
        </div>
        {p.refundMinor > 0 && (
          <>
            <div className={row}>
              <dt className="text-muted-foreground">Refund method</dt>
              <dd>
                {p.refundMethod === 'manual_bank'
                  ? 'Bank transfer by the hotel'
                  : 'Your original payment method'}
              </dd>
            </div>
            <div className={row}>
              <dt className="text-muted-foreground">Expected within</dt>
              <dd>{p.timeline}</dd>
            </div>
          </>
        )}
      </dl>
      <Alert variant="neutral" size="panel">
        <AlertTitle>Why: {p.rule}</AlertTitle>
        <AlertDescription>{kindNote[p.kind](p)}</AlertDescription>
      </Alert>
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
  const previewQuery = useCancellationPreview(v.reference, open);
  const cancelBooking = useCancelBooking();
  const [step, setStep] = useState<'review' | 'confirm' | 'done'>('review');
  const preview = previewQuery.data ?? null;
  const loadState = previewQuery.isPending
    ? 'loading'
    : previewQuery.isError
      ? 'error'
      : 'ready';
  const form = useForm<CancelFormInput, unknown, CancelFormOutput>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { reason: null, note: '', acknowledged: false },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors: formErrors, isSubmitting },
    register,
    reset,
  } = form;
  const note = useWatch({ control, name: 'note' }) ?? '';
  const busy = isSubmitting || cancelBooking.isPending;
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
  useEffect(() => {
    if (
      previewQuery.error instanceof ServiceError &&
      previewQuery.error.body?.code === ERROR_CODES.SESSION_EXPIRED
    )
      onSessionExpired();
  }, [previewQuery.error, onSessionExpired]);
  const submit = async (input: CancelFormOutput) => {
    if (busy || !preview) return;
    setError(null);
    try {
      const next = await cancelBooking.mutateAsync({
        reference: v.reference,
        body: {
          idempotencyKey: key.current,
          reason: (input.reason || null) as CancelRequest['reason'],
          note: input.note?.trim() || null,
          acknowledged: true,
          expectedRefundMinor: preview.refundMinor,
        },
        csrf,
      });
      setResult(next);
      setStep('done');
      onUpdated(next, SUCCESS_MESSAGES.BOOKING_CANCELLED);
    } catch (e) {
      const f = e instanceof ServiceError ? e : null;
      if (f?.body?.code === ERROR_CODES.SESSION_EXPIRED) onSessionExpired();
      else if (
        f?.body?.code === ERROR_CODES.PREVIEW_CHANGED &&
        f.body.preview
      ) {
        key.current = newKey();
        /* The preview query is refreshed after the server rejects the stale amount. */
        void previewQuery.refetch();
        setStep('review');
        setNotice(ERROR_MESSAGES.REFUND_AMOUNT_CHANGED_REVIEW);
      } else if (!f || f.network || f.status >= 500) {
        setError({
          message: ERROR_MESSAGES.COULD_NOT_REACH_SERVER_CANCEL_UNKNOWN,
          retryable: true,
        });
      } else {
        key.current = newKey();
        setError({
          message: f.body?.message ?? ERROR_MESSAGES.COULD_NOT_CANCEL_BOOKING,
          retryable: false,
        });
      }
    }
  };
  const submitForm = (event: React.SubmitEvent<HTMLFormElement>) => {
    void form.handleSubmit(submit)(event);
  };
  function handleDialogClose() {
    setStep('review');
    reset();
    setError(null);
    setResult(null);
    setNotice(null);
    key.current = newKey();
    onClose();
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
      onClose={handleDialogClose}
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
              notice={ERROR_MESSAGES.SESSION_ENDED_VERIFY_CONTINUE}
              onVerified={onReverified}
            />
          ) : step === 'done' && result ? (
            <div className="space-y-5">
              <div role="status" className="flex items-start gap-4">
                <SuccessMark size="inline" />
                <div>
                  <p className="font-display text-h3">
                    Your booking is cancelled
                  </p>
                  <p className="mt-2 text-ink/85">
                    {c?.refundStatus === 'initiated' &&
                      `We've started a refund of ${formatMinor(c.refundMinor)} to your original payment method. Expect it within ${c.timeline}.`}
                    {c?.refundStatus === 'pending_manual' &&
                      `The hotel will refund ${formatMinor(c.refundMinor)} to your bank by transfer. Expect it within ${c.timeline}. They may contact you for your account details.`}
                    {c?.refundStatus === 'none' &&
                      'No refund is due under the cancellation policy.'}
                  </p>
                  <p className="mt-2 text-small text-muted-foreground">
                    We emailed a confirmation to {result.guest.email}.
                  </p>
                </div>
              </div>
              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
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
                    className="h-10 rounded-sm bg-ink/10 motion-safe:animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : loadState === 'error' || !preview ? (
            <Alert role="alert" variant="destructive" size="banner">
              <AlertTitle>
                {ERROR_MESSAGES.COULD_NOT_WORK_OUT_REFUND}
              </AlertTitle>
              <AlertDescription>
                <p>
                  Nothing has been changed. Try again, or contact the hotel.
                </p>
              </AlertDescription>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void previewQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          ) : step === 'review' ? (
            <div className="space-y-5">
              {notice && (
                <Alert role="alert" variant="warning" size="banner">
                  <AlertTitle>Please review the new amount</AlertTitle>
                  <AlertDescription>
                    <p>{notice}</p>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-ink/85">
                Here is exactly what happens if you cancel. Nothing is changed
                until you confirm.
              </p>
              <RefundSummary p={preview} />
              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
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
            <form noValidate onSubmit={submitForm} className="space-y-5">
              <Alert variant="neutral" size="panel">
                <AlertDescription>
                  You will get back{' '}
                  <span className="font-semibold">
                    {formatMinor(preview.refundMinor)}
                  </span>
                  . The hotel keeps{' '}
                  <span className="font-semibold">
                    {formatMinor(preview.retainedMinor)}
                  </span>
                  .
                </AlertDescription>
              </Alert>
              <div className="space-y-1.5">
                <Label
                  htmlFor="cancel-reason"
                  className="text-small font-semibold"
                >
                  Reason{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Controller
                  control={control}
                  name="reason"
                  render={({ field }) => (
                    <Select
                      items={[
                        { value: 'none', label: 'Choose a reason' },
                        ...CANCEL_REASONS.map((r) => ({ value: r, label: r })),
                      ]}
                      value={field.value ?? 'none'}
                      onValueChange={(val) =>
                        field.onChange(val === 'none' || !val ? null : val)
                      }
                      disabled={busy}
                    >
                      <SelectTrigger
                        id="cancel-reason"
                        className="min-h-12 w-full bg-card"
                      >
                        <SelectValue placeholder="Choose a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose a reason</SelectItem>
                        {CANCEL_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="cancel-note"
                  className="text-small font-semibold"
                >
                  Anything you would like to add{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="cancel-note"
                  {...register('note')}
                  maxLength={300}
                  rows={3}
                  disabled={busy}
                  aria-describedby="cancel-note-count"
                  aria-invalid={formErrors.note ? true : undefined}
                  className="w-full bg-card"
                />
                <p
                  id="cancel-note-count"
                  className="mt-1 text-caption text-muted-foreground"
                >
                  {note.length} / 300 characters
                </p>
              </div>
              <div>
                <Label
                  htmlFor="cancel-ack"
                  className="flex cursor-pointer items-start gap-3 py-1 font-normal"
                >
                  <Controller
                    control={control}
                    name="acknowledged"
                    render={({ field }) => (
                      <Checkbox
                        id="cancel-ack"
                        name={field.name}
                        ref={field.ref}
                        checked={field.value === true}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        onBlur={field.onBlur}
                        aria-invalid={
                          formErrors.acknowledged ? true : undefined
                        }
                        aria-describedby={
                          formErrors.acknowledged
                            ? 'cancel-ack-error'
                            : undefined
                        }
                        className="mt-0.5"
                      />
                    )}
                  />
                  <span className="text-small">
                    I understand this cannot be undone.
                  </span>
                </Label>
                {formErrors.acknowledged && (
                  <p
                    id="cancel-ack-error"
                    className="mt-1.5 text-small font-medium text-destructive"
                  >
                    {formErrors.acknowledged.message}
                  </p>
                )}
              </div>
              {error && (
                <Alert role="alert" variant="destructive" size="banner">
                  <AlertTitle>
                    {ERROR_MESSAGES.BOOKING_NOT_CANCELLED_YET}
                  </AlertTitle>
                  <AlertDescription>
                    <p>{error.message}</p>
                  </AlertDescription>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {error.retryable ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() => void form.handleSubmit(submit)()}
                      >
                        Try again
                      </Button>
                    ) : undefined}
                  </div>
                </Alert>
              )}
              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
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

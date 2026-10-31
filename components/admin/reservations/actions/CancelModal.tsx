'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useCancellationPreview,
  useCancelReservation,
} from '@/hooks/services/admin/use-reservations';
import { formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { cancelSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const cancelFormSchema = cancelSchema
  .omit({ version: true, idempotencyKey: true, refundAmountMinor: true })
  .extend({
    refundNaira: z.string().refine((value) => {
      const amount = Number.parseFloat(value);
      return !Number.isNaN(amount) && amount >= 0;
    }, ERROR_MESSAGES.INVALID_REFUND_AMOUNT),
    overrideRefund: z.boolean(),
    acknowledged: z.boolean().refine((value) => value, {
      message: ERROR_MESSAGES.PLEASE_ACKNOWLEDGE_CANCELLATION,
    }),
  })
  .superRefine((value, ctx) => {
    if (
      value.overrideRefund &&
      (!value.overrideReason || value.overrideReason.trim().length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['overrideReason'],
        message: ERROR_MESSAGES.CANCELLATION_OVERRIDE_REASON,
      });
    }
  });

type CancelFormInput = z.input<typeof cancelFormSchema>;
type CancelFormOutput = z.output<typeof cancelFormSchema>;

interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function CancelModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: CancelModalProps) {
  const previewQuery = useCancellationPreview(reservation.id, open);
  const cancelReservation = useCancelReservation();
  const form = useForm<CancelFormInput, unknown, CancelFormOutput>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: {
      overrideRefund: false,
      refundNaira: '0',
      overrideReason: '',
      reason: 'guest_requested',
      note: '',
      doNotEmailGuest: false,
      acknowledged: false,
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
    setValue,
    watch,
  } = form;
  const overrideRefund = watch('overrideRefund');
  const acknowledged = watch('acknowledged');
  const busy = isSubmitting || cancelReservation.isPending;
  const [error, setError] = useState<string | null>(null);
  const preview = previewQuery.data ?? null;
  const previewError = previewQuery.error
    ? previewQuery.error instanceof Error
      ? previewQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_PREVIEW_CANCELLATION
    : null;

  useEffect(() => {
    if (preview) {
      setValue('refundNaira', (preview.calculatedRefundMinor / 100).toString());
    }
  }, [preview, setValue]);

  const onSubmit = async (input: CancelFormOutput) => {
    setError(null);

    try {
      const updated = await cancelReservation.mutateAsync({
        id: reservation.id,
        body: {
          refundAmountMinor: Math.round(
            Number.parseFloat(input.refundNaira) * 100,
          ),
          overrideReason: input.overrideRefund
            ? input.overrideReason?.trim()
            : undefined,
          reason: input.reason,
          note: input.note?.trim() || undefined,
          doNotEmailGuest: input.doNotEmailGuest,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.RESERVATION_CANCELLED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_CANCEL_RESERVATION_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  const submit = form.handleSubmit(onSubmit, (formErrors) => {
    if (formErrors.acknowledged) {
      setError(ERROR_MESSAGES.PLEASE_ACKNOWLEDGE_CANCELLATION);
    }
  });

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Cancel Reservation"
      description={`Cancel stay ${reservation.reference} for ${reservation.guestName}.`}
      error={error ?? previewError}
      onRefresh={onRefresh}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {/* Warning Alert */}
        <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            Cancelling frees room {reservation.roomNumber} immediately for new
            bookings. This action cannot be reversed.
          </span>
        </div>

        {/* Policy Refund Preview */}
        {previewQuery.isPending ? (
          <div className="text-small text-muted-foreground flex items-center justify-center p-6">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Calculating policy refund...
          </div>
        ) : preview ? (
          <div className="bg-muted rounded-control border-line text-small space-y-2 border p-4">
            <h3 className="text-ink font-semibold">
              Cancellation Policy Evaluation
            </h3>
            <p className="text-caption text-muted-foreground">{preview.rule}</p>
            <div className="border-line flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">
                Calculated Policy Refund:
              </span>
              <span className="text-success font-bold">
                {formatNaira(preview.calculatedRefundMinor / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount Retained:</span>
              <span className="text-ink font-medium">
                {formatNaira(preview.retainedMinor / 100)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Override Refund Option */}
        <div className="border-line space-y-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="overrideRefund"
              render={({ field }) => (
                <Checkbox
                  id="cancel-override-refund"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                  disabled={busy}
                />
              )}
            />
            <Label htmlFor="cancel-override-refund" className="cursor-pointer">
              Override policy refund amount (Manager / Owner)
            </Label>
          </div>

          {overrideRefund && (
            <div className="space-y-3 pl-6">
              <Field
                id="cancel-refund-amount"
                label="Custom Refund Amount (₦)"
                error={errors.refundNaira?.message}
                hint={`Maximum refundable: ${formatNaira((preview?.maxRefundMinor ?? 0) / 100)}`}
              >
                {(a) => (
                  <Input
                    {...a}
                    {...register('refundNaira')}
                    type="number"
                    step="any"
                    min="0"
                    max={(preview?.maxRefundMinor ?? 0) / 100}
                    disabled={busy}
                    className={inputClass(errors.refundNaira?.message)}
                  />
                )}
              </Field>

              <Field
                id="cancel-override-reason"
                label="Override Reason *"
                error={errors.overrideReason?.message}
              >
                {(a) => (
                  <Input
                    {...a}
                    {...register('overrideReason')}
                    type="text"
                    disabled={busy}
                    placeholder="e.g. Management courtesy due to flight disruption..."
                    className={inputClass(errors.overrideReason?.message)}
                  />
                )}
              </Field>
            </div>
          )}
        </div>

        {/* Cancellation Reason Selection */}
        <Field
          id="cancel-reason"
          label="Reason for Cancellation *"
          error={errors.reason?.message}
        >
          {(a) => (
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select
                  items={[
                    {
                      value: 'guest_requested',
                      label: 'Guest requested cancellation',
                    },
                    {
                      value: 'emergency_change',
                      label: 'Medical or personal emergency',
                    },
                    {
                      value: 'duplicate_booking',
                      label: 'Duplicate booking',
                    },
                    {
                      value: 'hotel_maintenance',
                      label: 'Hotel maintenance or room issue',
                    },
                    {
                      value: 'unpaid_expired',
                      label: 'Payment not completed in time',
                    },
                    { value: 'other', label: 'Other reason' },
                  ]}
                  value={field.value}
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                  disabled={busy}
                >
                  <SelectTrigger
                    id={a.id}
                    aria-describedby={a['aria-describedby']}
                    aria-invalid={a['aria-invalid']}
                    onBlur={field.onBlur}
                    className={inputClass(errors.reason?.message)}
                  >
                    <SelectValue placeholder="Select cancellation reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest_requested">
                      Guest requested cancellation
                    </SelectItem>
                    <SelectItem value="emergency_change">
                      Medical or personal emergency
                    </SelectItem>
                    <SelectItem value="duplicate_booking">
                      Duplicate booking
                    </SelectItem>
                    <SelectItem value="hotel_maintenance">
                      Hotel maintenance or room issue
                    </SelectItem>
                    <SelectItem value="unpaid_expired">
                      Payment not completed in time
                    </SelectItem>
                    <SelectItem value="other">Other reason</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>

        <Field id="cancel-staff-note" label="Staff Note">
          {(a) => (
            <Input
              {...a}
              {...register('note')}
              type="text"
              disabled={busy}
              placeholder="Additional notes for hotel records..."
              className={inputClass()}
            />
          )}
        </Field>

        {/* Options */}
        <div className="border-line space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="doNotEmailGuest"
              render={({ field }) => (
                <Checkbox
                  id="cancel-no-email"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                  disabled={busy}
                />
              )}
            />
            <Label htmlFor="cancel-no-email" className="cursor-pointer">
              Do not email cancellation notice to guest
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="acknowledged"
              render={({ field }) => (
                <Checkbox
                  id="cancel-acknowledged"
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  onBlur={field.onBlur}
                  disabled={busy}
                />
              )}
            />
            <Label
              htmlFor="cancel-acknowledged"
              className="text-destructive cursor-pointer font-semibold"
            >
              I understand that this cancellation cannot be undone
            </Label>
          </div>
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Keep reservation
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={busy || !acknowledged}
            loading={busy}
          >
            Confirm cancellation
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

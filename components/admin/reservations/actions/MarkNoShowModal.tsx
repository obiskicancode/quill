'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useMarkReservationNoShow } from '@/hooks/services/admin/use-reservations';
import { formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { noShowSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

function makeNoShowFormSchema(netPaidNaira: number) {
  return noShowSchema
    .omit({ version: true, idempotencyKey: true, refundAmountMinor: true })
    .extend({
      overrideRefund: z.boolean(),
      refundNaira: z.string(),
    })
    .superRefine((value, ctx) => {
      if (!value.overrideRefund) return;

      const amount = Number.parseFloat(value.refundNaira);
      if (Number.isNaN(amount) || amount < 0 || amount > netPaidNaira) {
        ctx.addIssue({
          code: 'custom',
          path: ['refundNaira'],
          message: ERROR_MESSAGES.REFUND_AMOUNT_BETWEEN(
            formatNaira(netPaidNaira),
          ),
        });
      }

      if (!value.overrideReason || value.overrideReason.trim().length < 3) {
        ctx.addIssue({
          code: 'custom',
          path: ['overrideReason'],
          message: ERROR_MESSAGES.REFUND_OVERRIDE_REASON_PROMPT,
        });
      }
    });
}

type NoShowFormInput = z.input<ReturnType<typeof makeNoShowFormSchema>>;
type NoShowFormOutput = z.output<ReturnType<typeof makeNoShowFormSchema>>;

interface MarkNoShowModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function MarkNoShowModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: MarkNoShowModalProps) {
  const netPaidNaira =
    (reservation.amountPaidMinor - reservation.amountRefundedMinor) / 100;
  const markNoShow = useMarkReservationNoShow();
  const form = useForm<NoShowFormInput, unknown, NoShowFormOutput>({
    resolver: zodResolver(makeNoShowFormSchema(netPaidNaira)),
    defaultValues: {
      overrideRefund: false,
      refundNaira: '0',
      overrideReason: '',
      reason: 'Guest failed to check in on arrival date',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const overrideRefund = useWatch({ control, name: 'overrideRefund' });
  const busy = isSubmitting || markNoShow.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: NoShowFormOutput) => {
    setError(null);

    try {
      const amount = input.overrideRefund
        ? Number.parseFloat(input.refundNaira)
        : 0;
      const updated = await markNoShow.mutateAsync({
        id: reservation.id,
        body: {
          refundAmountMinor: Math.round(amount * 100),
          overrideReason: input.overrideRefund
            ? input.overrideReason?.trim()
            : undefined,
          reason: input.reason?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.NO_SHOW_MARKED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_MARK_NO_SHOW_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Mark as No-Show"
      description={`Record no-show for ${reservation.guestName} (${reservation.reference}).`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Marking as no-show frees room {reservation.roomNumber} for the
            remaining nights of the stay.
          </span>
        </div>

        <div className="bg-muted rounded-control border-line text-small space-y-1 border p-3.5">
          <p className="text-ink font-semibold">Hotel No-Show Policy:</p>
          <p className="text-caption text-muted-foreground">
            Guests who fail to arrive by the scheduled date are considered
            no-shows and forfeit the deposit or paid stay under hotel terms.
          </p>
        </div>

        {/* Override refund toggle */}
        {netPaidNaira > 0 && (
          <div className="border-line space-y-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="overrideRefund"
                render={({ field }) => (
                  <Checkbox
                    id="noshow-override-refund"
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
                htmlFor="noshow-override-refund"
                className="cursor-pointer"
              >
                Issue goodwill partial refund (Staff override)
              </Label>
            </div>

            {overrideRefund && (
              <div className="space-y-3 pl-6">
                <Field
                  id="noshow-refund-amount"
                  label="Refund Amount (₦)"
                  error={errors.refundNaira?.message}
                  hint={`Max refundable: ${formatNaira(netPaidNaira)}`}
                >
                  {(a) => (
                    <Input
                      {...a}
                      {...register('refundNaira')}
                      type="number"
                      step="any"
                      min="0"
                      max={netPaidNaira}
                      disabled={busy}
                      className={inputClass(errors.refundNaira?.message)}
                    />
                  )}
                </Field>

                <Field
                  id="noshow-override-reason"
                  label="Override Reason *"
                  error={errors.overrideReason?.message}
                >
                  {(a) => (
                    <Input
                      {...a}
                      {...register('overrideReason')}
                      type="text"
                      disabled={busy}
                      placeholder="e.g. Guest notified delay, partial refund authorized..."
                      className={inputClass(errors.overrideReason?.message)}
                    />
                  )}
                </Field>
              </div>
            )}
          </div>
        )}

        <Field
          id="noshow-reason"
          label="Note / Reason"
          error={errors.reason?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('reason')}
              type="text"
              disabled={busy}
              className={inputClass(errors.reason?.message)}
            />
          )}
        </Field>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" variant="destructive" size="sm" loading={busy}>
            Confirm no-show
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

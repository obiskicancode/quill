'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useRecordReservationPayment } from '@/hooks/services/admin/use-reservations';
import { formatMinor, formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { recordPaymentSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

function makeRecordPaymentFormSchema(maxNaira: number) {
  return recordPaymentSchema
    .omit({ version: true, idempotencyKey: true, amountMinor: true })
    .extend({
      amountNaira: z.string().superRefine((value, ctx) => {
        const amount = Number.parseFloat(value);

        if (Number.isNaN(amount) || amount <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: ERROR_MESSAGES.POSITIVE_PAYMENT_AMOUNT,
          });
        } else if (amount > maxNaira + 1) {
          ctx.addIssue({
            code: 'custom',
            message: ERROR_MESSAGES.AMOUNT_EXCEEDS_BALANCE(
              formatNaira(maxNaira),
            ),
          });
        }
      }),
    });
}

type RecordPaymentFormInput = z.input<
  ReturnType<typeof makeRecordPaymentFormSchema>
>;
type RecordPaymentFormOutput = z.output<
  ReturnType<typeof makeRecordPaymentFormSchema>
>;

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function RecordPaymentModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: RecordPaymentModalProps) {
  const maxNaira = reservation.balanceMinor / 100;
  const recordPayment = useRecordReservationPayment();
  const form = useForm<
    RecordPaymentFormInput,
    unknown,
    RecordPaymentFormOutput
  >({
    resolver: zodResolver(makeRecordPaymentFormSchema(maxNaira)),
    defaultValues: {
      amountNaira: maxNaira.toString(),
      type: 'balance',
      method: 'cash',
      reference: '',
      note: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const busy = isSubmitting || recordPayment.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: RecordPaymentFormOutput) => {
    setError(null);

    try {
      const updated = await recordPayment.mutateAsync({
        id: reservation.id,
        body: {
          amountMinor: Math.round(Number.parseFloat(input.amountNaira) * 100),
          type: input.type,
          method: input.method,
          reference: input.reference.trim(),
          note: input.note?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.PAYMENT_RECORDED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_RECORD_PAYMENT_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Record Payment"
      description={`Record an in-person, cash, transfer, or POS payment for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Outstanding Balance Banner */}
        <div className="flex items-center justify-between rounded-control border border-line bg-muted p-3.5 text-small">
          <span className="text-muted-foreground">Balance Due:</span>
          <span className="font-bold text-ink">
            {formatMinor(reservation.balanceMinor)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="payment-amount"
            label="Amount (₦) *"
            error={errors.amountNaira?.message}
          >
            {(a) => (
              <Input
                {...a}
                {...register('amountNaira')}
                type="number"
                step="any"
                min="1"
                max={maxNaira}
                disabled={busy}
                className={inputClass(errors.amountNaira?.message)}
              />
            )}
          </Field>

          <Field
            id="payment-allocation"
            label="Payment Allocation"
            error={errors.type?.message}
          >
            {(a) => (
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    items={[
                      { value: 'balance', label: 'Balance Payment' },
                      { value: 'deposit', label: 'Deposit Payment' },
                      { value: 'full', label: 'Full Stay Payment' },
                    ]}
                    value={field.value}
                    onValueChange={(val) => {
                      if (val)
                        field.onChange(val as 'deposit' | 'balance' | 'full');
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id={a.id}
                      aria-describedby={a['aria-describedby']}
                      aria-invalid={a['aria-invalid']}
                      onBlur={field.onBlur}
                      className={inputClass(errors.type?.message)}
                    >
                      <SelectValue placeholder="Select allocation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balance">Balance Payment</SelectItem>
                      <SelectItem value="deposit">Deposit Payment</SelectItem>
                      <SelectItem value="full">Full Stay Payment</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="payment-method"
            label="Payment Method *"
            error={errors.method?.message}
          >
            {(a) => (
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select
                    items={[
                      { value: 'cash', label: 'Cash at Hotel' },
                      { value: 'bank_transfer', label: 'Direct Bank Transfer' },
                      { value: 'card', label: 'Card POS Terminal' },
                    ]}
                    value={field.value}
                    onValueChange={(val) => {
                      if (val)
                        field.onChange(
                          val as 'cash' | 'bank_transfer' | 'card',
                        );
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id={a.id}
                      aria-describedby={a['aria-describedby']}
                      aria-invalid={a['aria-invalid']}
                      onBlur={field.onBlur}
                      className={inputClass(errors.method?.message)}
                    >
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash at Hotel</SelectItem>
                      <SelectItem value="bank_transfer">
                        Direct Bank Transfer
                      </SelectItem>
                      <SelectItem value="card">Card POS Terminal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>

          <Field
            id="payment-reference"
            label="Payment Reference *"
            hint="The bank transfer narration, POS slip number or cash receipt number the money arrived under."
            error={errors.reference?.message}
          >
            {(a) => (
              <Input
                {...a}
                {...register('reference')}
                type="text"
                disabled={busy}
                placeholder="e.g. GTB narration 0921554411"
                className={`${inputClass(errors.reference?.message)} font-mono`}
              />
            )}
          </Field>
        </div>

        <Field
          id="payment-note"
          label="Staff Note / Receipt Info"
          error={errors.note?.message}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register('note')}
              rows={2}
              disabled={busy}
              placeholder="e.g. Received at front desk desk receipt #0492..."
              className={inputClass(errors.note?.message)}
            />
          )}
        </Field>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            Record payment
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

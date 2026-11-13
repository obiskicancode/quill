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
import { useIssueReservationRefund } from '@/hooks/services/admin/use-reservations';
import { formatMinor, formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { refundSchema } from '@/schemas/reservation.schema';
import type {
  ReservationDetail,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

function makeRefundFormSchema(maxNaira: number) {
  return refundSchema
    .omit({
      version: true,
      idempotencyKey: true,
      paymentId: true,
      amountMinor: true,
    })
    .extend({
      amountNaira: z.string().superRefine((value, ctx) => {
        const amount = Number.parseFloat(value);

        if (Number.isNaN(amount) || amount <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: ERROR_MESSAGES.POSITIVE_REFUND_AMOUNT,
          });
        } else if (amount > maxNaira) {
          ctx.addIssue({
            code: 'custom',
            message: ERROR_MESSAGES.AMOUNT_EXCEEDS_PAYMENT_BALANCE(
              formatNaira(maxNaira),
            ),
          });
        }
      }),
    });
}

type RefundFormInput = z.input<ReturnType<typeof makeRefundFormSchema>>;
type RefundFormOutput = z.output<ReturnType<typeof makeRefundFormSchema>>;

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  payment: ReservationPaymentItem;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

/** Issues an admin refund with method, amount and reason validation. */
export function RefundModal({
  open,
  onClose,
  reservation,
  payment,
  onSuccess,
  onRefresh,
}: RefundModalProps) {
  const maxNaira = payment.amountMinor / 100;
  const defaultMethod =
    payment.provider === 'cash'
      ? 'manual_cash'
      : payment.provider === 'bank_transfer'
        ? 'manual_bank'
        : 'provider';
  const issueRefund = useIssueReservationRefund();
  const form = useForm<RefundFormInput, unknown, RefundFormOutput>({
    resolver: zodResolver(makeRefundFormSchema(maxNaira)),
    defaultValues: {
      amountNaira: maxNaira.toString(),
      method: defaultMethod,
      reason: '',
      reference: '',
      notes: '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const busy = isSubmitting || issueRefund.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: RefundFormOutput) => {
    setError(null);

    try {
      const updated = await issueRefund.mutateAsync({
        id: reservation.id,
        body: {
          paymentId: payment.id,
          amountMinor: Math.round(Number.parseFloat(input.amountNaira) * 100),
          reason: input.reason.trim(),
          method: input.method,
          reference: input.reference?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.REFUND_ISSUED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_ISSUE_REFUND_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Issue Refund"
      description={`Refund payment ${payment.reference} for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Payment Summary */}
        <div className="flex items-center justify-between rounded-control border border-line bg-muted p-3 text-small">
          <div>
            <span className="text-caption text-muted-foreground">
              Original Payment:
            </span>
            <p className="font-semibold text-ink">
              {formatMinor(payment.amountMinor)} ({payment.provider})
            </p>
          </div>
          <span className="font-mono text-caption text-muted-foreground">
            {payment.reference}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="refund-amount"
            label="Refund Amount (₦) *"
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
            id="refund-channel"
            label="Refund Channel *"
            error={errors.method?.message}
          >
            {(a) => (
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select
                    items={[
                      ...(payment.provider !== 'cash' &&
                      payment.provider !== 'bank_transfer'
                        ? [
                            {
                              value: 'provider',
                              label: `Original Payment Gateway (${payment.provider})`,
                            },
                          ]
                        : []),
                      {
                        value: 'manual_bank',
                        label: 'Bank Transfer to Guest',
                      },
                      {
                        value: 'manual_cash',
                        label: 'Cash Handed to Guest',
                      },
                    ]}
                    value={field.value}
                    onValueChange={(val) => {
                      if (val) {
                        field.onChange(
                          val as 'provider' | 'manual_bank' | 'manual_cash',
                        );
                      }
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
                      <SelectValue placeholder="Select refund channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {payment.provider !== 'cash' &&
                        payment.provider !== 'bank_transfer' && (
                          <SelectItem value="provider">
                            Original Payment Gateway ({payment.provider})
                          </SelectItem>
                        )}
                      <SelectItem value="manual_bank">
                        Bank Transfer to Guest
                      </SelectItem>
                      <SelectItem value="manual_cash">
                        Cash Handed to Guest
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>
        </div>

        <Field
          id="refund-reason"
          label="Refund Reason *"
          error={errors.reason?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('reason')}
              type="text"
              disabled={busy}
              placeholder="e.g. Overpayment adjustment, early departure..."
              className={inputClass(errors.reason?.message)}
            />
          )}
        </Field>

        <Field
          id="refund-reference"
          label="Internal Note / Reference"
          optional
          hint="The bank payout reference or till receipt, if one exists."
          error={errors.reference?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('reference')}
              type="text"
              disabled={busy}
              placeholder="Transaction reference or receipt code..."
              className={`${inputClass(errors.reference?.message)} font-mono`}
            />
          )}
        </Field>

        <Field
          id="refund-staff-notes"
          label="Staff Notes"
          error={errors.notes?.message}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register('notes')}
              rows={2}
              disabled={busy}
              placeholder="Additional context or notes..."
              className={inputClass(errors.notes?.message)}
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
          <Button type="submit" variant="destructive" size="sm" loading={busy}>
            Confirm refund
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

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
import { toast } from '@/components/ui/toast';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useResendReservationConfirmation } from '@/hooks/services/admin/use-reservations';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { resendConfirmationSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const resendFormSchema = resendConfirmationSchema
  .omit({ idempotencyKey: true })
  .extend({
    recipient: z.email(ERROR_MESSAGES.VALID_RECIPIENT_EMAIL),
  });

type ResendFormInput = z.input<typeof resendFormSchema>;
type ResendFormOutput = z.output<typeof resendFormSchema>;

interface ResendConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: () => void;
  onRefresh: () => void;
}

/** Re-sends the guest confirmation email after a confirmation step. */
export function ResendConfirmationModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ResendConfirmationModalProps) {
  const resendConfirmation = useResendReservationConfirmation();
  const form = useForm<ResendFormInput, unknown, ResendFormOutput>({
    resolver: zodResolver(resendFormSchema),
    defaultValues: {
      templateKey: 'booking_confirmation',
      recipient: reservation.guestEmail ?? '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const busy = isSubmitting || resendConfirmation.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ResendFormOutput) => {
    setError(null);

    try {
      await resendConfirmation.mutateAsync({
        id: reservation.id,
        body: {
          templateKey: input.templateKey,
          recipient: input.recipient.trim(),
          idempotencyKey: crypto.randomUUID(),
        },
      });

      toast.add({
        title: SUCCESS_MESSAGES.CONFIRMATION_EMAIL_SENT,
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_RESEND_CONFIRMATION,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Resend Guest Notification"
      description={`Queue confirmation or receipt email for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <Field
          id="resend-template"
          label="Template Type *"
          error={errors.templateKey?.message}
        >
          {(a) => (
            <Controller
              control={control}
              name="templateKey"
              render={({ field }) => (
                <Select
                  items={[
                    {
                      value: 'booking_confirmation',
                      label: 'Booking Confirmation',
                    },
                    {
                      value: 'payment_receipt',
                      label: 'Payment Receipt',
                    },
                    {
                      value: 'cancellation_notice',
                      label: 'Cancellation Notice',
                    },
                  ]}
                  value={field.value}
                  onValueChange={(val) => {
                    if (val) {
                      field.onChange(
                        val as
                          | 'booking_confirmation'
                          | 'payment_receipt'
                          | 'cancellation_notice',
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
                    className={inputClass(errors.templateKey?.message)}
                  >
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking_confirmation">
                      Booking Confirmation
                    </SelectItem>
                    <SelectItem value="payment_receipt">
                      Payment Receipt
                    </SelectItem>
                    <SelectItem value="cancellation_notice">
                      Cancellation Notice
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>

        <Field
          id="resend-recipient"
          label="Recipient Email *"
          error={errors.recipient?.message}
          hint="You can send to the guest's email or an alternative address."
        >
          {(a) => (
            <Input
              {...a}
              {...register('recipient')}
              type="email"
              disabled={busy}
              placeholder="guest@example.com"
              className={inputClass(errors.recipient?.message)}
            />
          )}
        </Field>

        <div className="rounded-control border border-line bg-muted p-3 text-caption text-muted-foreground">
          Resend cooldown: to prevent mail provider throttling, requests are
          logged in audit history.
        </div>

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
            Send notification
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

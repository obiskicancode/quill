'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useApproveDeclineReservation } from '@/hooks/services/admin/use-reservations';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { adminApproveDeclineSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const approveDeclineFormSchema = adminApproveDeclineSchema
  .omit({ version: true, idempotencyKey: true })
  .superRefine((value, ctx) => {
    if (
      value.action === 'decline' &&
      (!value.reason || value.reason.trim().length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: ERROR_MESSAGES.DECLINE_REASON_PROMPT,
      });
    }
  });

type ApproveDeclineFormInput = z.input<typeof approveDeclineFormSchema>;
type ApproveDeclineFormOutput = z.output<typeof approveDeclineFormSchema>;

interface ApproveDeclineModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  initialAction?: 'approve' | 'decline';
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function ApproveDeclineModal({
  open,
  onClose,
  reservation,
  initialAction = 'approve',
  onSuccess,
  onRefresh,
}: ApproveDeclineModalProps) {
  const approveDecline = useApproveDeclineReservation();
  const form = useForm<
    ApproveDeclineFormInput,
    unknown,
    ApproveDeclineFormOutput
  >({
    resolver: zodResolver(approveDeclineFormSchema),
    defaultValues: {
      action: initialAction,
      reason: '',
    },
    mode: 'onBlur',
  });
  const {
    clearErrors,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
    setValue,
    watch,
  } = form;
  const action = watch('action');
  const busy = isSubmitting || approveDecline.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: ApproveDeclineFormOutput) => {
    setError(null);

    try {
      const updated = await approveDecline.mutateAsync({
        id: reservation.id,
        body: {
          action: input.action,
          reason: input.reason?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(
        updated,
        input.action === 'approve'
          ? SUCCESS_MESSAGES.RESERVATION_APPROVED
          : SUCCESS_MESSAGES.RESERVATION_DECLINED,
      );
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ServiceError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : ERROR_MESSAGES.FAILED_TO_PROCESS_APPROVAL,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={
        action === 'approve' ? 'Approve Reservation' : 'Decline Reservation'
      }
      description={`Review manual booking request for ${reservation.guestName} (${reservation.reference}).`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Action Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={action === 'approve' ? 'default' : 'outline'}
            size="md"
            onClick={() => {
              setValue('action', 'approve');
              clearErrors('reason');
            }}
            className={
              action === 'approve'
                ? 'bg-success hover:bg-success/90 text-white'
                : ''
            }
          >
            <Check className="size-4" aria-hidden="true" />
            <span>Approve Booking</span>
          </Button>
          <Button
            type="button"
            variant={action === 'decline' ? 'destructive' : 'outline'}
            size="md"
            onClick={() => setValue('action', 'decline')}
          >
            <X className="size-4" aria-hidden="true" />
            <span>Decline Request</span>
          </Button>
        </div>

        {/* Stay Summary */}
        <div className="bg-muted rounded-control border-line text-small space-y-1 border p-3">
          <p>
            <span className="text-muted-foreground">Room:</span>{' '}
            {reservation.roomTypeName} (Room {reservation.roomNumber})
          </p>
          <p>
            <span className="text-muted-foreground">Dates:</span>{' '}
            {reservation.checkIn} to {reservation.checkOut} (
            {reservation.nights} nights)
          </p>
          <p>
            <span className="text-muted-foreground">Guests:</span>{' '}
            {reservation.adults} Adults
            {reservation.children > 0
              ? `, ${reservation.children} Children`
              : ''}
          </p>
        </div>

        {action === 'approve' ? (
          <p className="text-small text-muted-foreground">
            Approving moves this reservation to <strong>Confirmed</strong>{' '}
            status and sends confirmation to{' '}
            <strong>{reservation.guestEmail || 'the guest'}</strong> with
            payment instructions.
          </p>
        ) : (
          <Field
            id="decline-reason"
            label="Decline Reason *"
            error={errors.reason?.message}
            hint="Declining cancels the booking and frees the assigned room immediately."
          >
            {(a) => (
              <Textarea
                {...a}
                {...register('reason')}
                rows={3}
                disabled={busy}
                placeholder="e.g. Hotel fully committed for private event, maintenance shutdown..."
                className={inputClass(errors.reason?.message)}
              />
            )}
          </Field>
        )}

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
          <Button
            type="submit"
            variant={action === 'approve' ? 'default' : 'destructive'}
            size="sm"
            loading={busy}
          >
            {action === 'approve'
              ? 'Confirm approval'
              : 'Decline & release room'}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

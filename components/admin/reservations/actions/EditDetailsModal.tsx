'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useUpdateReservationDetails } from '@/hooks/services/admin/use-reservations';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { editDetailsSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const editDetailsFormSchema = editDetailsSchema.omit({
  version: true,
  idempotencyKey: true,
});

type EditDetailsFormInput = z.input<typeof editDetailsFormSchema>;
type EditDetailsFormOutput = z.output<typeof editDetailsFormSchema>;

interface EditDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function EditDetailsModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: EditDetailsModalProps) {
  const updateDetails = useUpdateReservationDetails();
  const form = useForm<EditDetailsFormInput, unknown, EditDetailsFormOutput>({
    resolver: zodResolver(editDetailsFormSchema),
    defaultValues: {
      fullName: reservation.guestName,
      email: reservation.guestEmail ?? '',
      phone: reservation.guestPhone ?? '',
      country: reservation.guestCountry ?? 'NG',
      arrivalTime: reservation.arrivalTime ?? '',
      specialRequests: reservation.specialRequests ?? '',
      internalNotes: reservation.notes ?? '',
    },
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
  } = form;
  const busy = isSubmitting || updateDetails.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: EditDetailsFormOutput) => {
    setError(null);

    try {
      const updated = await updateDetails.mutateAsync({
        id: reservation.id,
        body: {
          fullName: input.fullName.trim(),
          email: input.email?.trim() || undefined,
          phone: input.phone.trim(),
          country: input.country?.trim() || undefined,
          arrivalTime: input.arrivalTime?.trim() || undefined,
          specialRequests: input.specialRequests?.trim() || undefined,
          internalNotes: input.internalNotes?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.RESERVATION_UPDATED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_UPDATE_DETAILS_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Edit guest details and notes"
      description={`Update contact and stay preferences for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <Field
          id="edit-guest-name"
          label="Guest Full Name *"
          error={errors.fullName?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('fullName')}
              type="text"
              disabled={busy}
              className={inputClass(errors.fullName?.message)}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="edit-guest-email"
            label="Email Address"
            error={errors.email?.message}
            hint="Changing email sends a new confirmation to the new address."
          >
            {(a) => (
              <Input
                {...a}
                {...register('email')}
                type="email"
                disabled={busy}
                placeholder="guest@example.com"
                className={inputClass(errors.email?.message)}
              />
            )}
          </Field>

          <Field
            id="edit-guest-phone"
            label="Phone Number *"
            error={errors.phone?.message}
          >
            {(a) => (
              <Input
                {...a}
                {...register('phone')}
                type="tel"
                disabled={busy}
                className={inputClass(errors.phone?.message)}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="edit-guest-country"
            label="Country Code"
            error={errors.country?.message}
          >
            {(a) => (
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Input
                    {...a}
                    name={field.name}
                    ref={field.ref}
                    type="text"
                    maxLength={2}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                    onBlur={field.onBlur}
                    disabled={busy}
                    placeholder="NG"
                    className={`${inputClass(errors.country?.message)} uppercase`}
                  />
                )}
              />
            )}
          </Field>

          <Field
            id="edit-arrival-time"
            label="Estimated Arrival Time"
            error={errors.arrivalTime?.message}
          >
            {(a) => (
              <Input
                {...a}
                {...register('arrivalTime')}
                type="text"
                disabled={busy}
                placeholder="e.g. 15:00"
                className={inputClass(errors.arrivalTime?.message)}
              />
            )}
          </Field>
        </div>

        <Field
          id="edit-special-requests"
          label="Special Requests"
          error={errors.specialRequests?.message}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register('specialRequests')}
              rows={2}
              disabled={busy}
              placeholder="Guest preferences, dietary requests, early check-in notes..."
              className={inputClass(errors.specialRequests?.message)}
            />
          )}
        </Field>

        <Field
          id="edit-internal-notes"
          label="Internal Staff Notes"
          error={errors.internalNotes?.message}
        >
          {(a) => (
            <Textarea
              {...a}
              {...register('internalNotes')}
              rows={3}
              disabled={busy}
              placeholder="Confidential notes visible only to front desk and managers..."
              className={inputClass(errors.internalNotes?.message)}
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
          <Button type="submit" size="sm" loading={busy}>
            Save details
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

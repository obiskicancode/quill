'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { AlertCircle, CalendarDays, Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  useChangeDatesQuote,
  useChangeReservationDates,
} from '@/hooks/services/admin/use-reservations';
import { formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { adminChangeDatesSchema } from '@/schemas/reservation.schema';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const changeDatesFormSchema = adminChangeDatesSchema
  .omit({ version: true, idempotencyKey: true })
  .extend({
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_CHECKIN_DATE),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_CHECKOUT_DATE),
  })
  .superRefine((value, ctx) => {
    if (value.checkOut <= value.checkIn) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkOut'],
        message: ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN_UI,
      });
    }
    if (
      value.overrideRules &&
      (!value.overrideReason || value.overrideReason.trim().length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['overrideReason'],
        message: ERROR_MESSAGES.OVERRIDE_REASON_REQUIRED,
      });
    }
  });

type ChangeDatesFormInput = z.input<typeof changeDatesFormSchema>;
type ChangeDatesFormOutput = z.output<typeof changeDatesFormSchema>;

interface ChangeDatesModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function ChangeDatesModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ChangeDatesModalProps) {
  const [quoteRequest, setQuoteRequest] = useState<{
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const quoteQuery = useChangeDatesQuote(
    reservation.id,
    quoteRequest ?? { checkIn: '', checkOut: '' },
    Boolean(quoteRequest),
  );
  const changeDates = useChangeReservationDates();
  const form = useForm<ChangeDatesFormInput, unknown, ChangeDatesFormOutput>({
    resolver: zodResolver(changeDatesFormSchema),
    defaultValues: {
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      roomId: reservation.roomId,
      overrideRules: false,
      overrideReason: '',
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
  const checkIn = watch('checkIn');
  const checkOut = watch('checkOut');
  const selectedRoomId = watch('roomId');
  const overrideRules = watch('overrideRules');
  const busy = isSubmitting || changeDates.isPending;
  const [error, setError] = useState<string | null>(null);
  const quoteData = quoteRequest ? (quoteQuery.data ?? null) : null;
  const quoting = quoteQuery.isFetching;
  const quoteError = quoteQuery.error
    ? quoteQuery.error instanceof Error
      ? quoteQuery.error.message
      : ERROR_MESSAGES.FAILED_TO_QUOTE_DATES
    : null;

  useEffect(() => {
    if (!quoteRequest || !quoteQuery.data) return;

    if (
      !quoteQuery.data.currentRoomAvailable &&
      quoteQuery.data.candidateRooms.length > 0
    ) {
      setValue('roomId', quoteQuery.data.candidateRooms[0].id);
    } else {
      setValue('roomId', reservation.roomId);
    }
  }, [quoteRequest, quoteQuery.data, reservation.roomId, setValue]);

  const handleFetchQuote = () => {
    if (checkOut <= checkIn) {
      setError(ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN_UI);
      return;
    }

    setError(null);

    if (
      quoteRequest &&
      quoteRequest.checkIn === checkIn &&
      quoteRequest.checkOut === checkOut
    ) {
      void quoteQuery.refetch();
    } else {
      setQuoteRequest({ checkIn, checkOut });
    }
  };

  const onSubmit = async (input: ChangeDatesFormOutput) => {
    if (!quoteData) {
      setError(ERROR_MESSAGES.CHECK_PRICE_AVAILABILITY_FIRST);
      return;
    }

    setError(null);

    try {
      const updated = await changeDates.mutateAsync({
        id: reservation.id,
        body: {
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          roomId: input.roomId,
          overrideRules: input.overrideRules,
          overrideReason: input.overrideReason?.trim() || undefined,
          version: reservation.updatedAt,
          idempotencyKey: crypto.randomUUID(),
        },
      });

      onSuccess(updated, SUCCESS_MESSAGES.RESERVATION_DATES_CHANGED);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_CHANGE_DATES_UI,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Change Stay Dates"
      description={`Modify arrival and departure dates for ${reservation.reference}.`}
      error={error ?? quoteError}
      maxWidth="xl"
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Date Inputs */}
        <Field
          id="change-dates"
          label="New Stay Dates *"
          error={errors.checkIn?.message ?? errors.checkOut?.message}
        >
          {(a) => (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    id={a.id}
                    aria-describedby={a['aria-describedby']}
                    aria-invalid={a['aria-invalid']}
                    variant="outline"
                    size="md"
                    className="w-full justify-start gap-2.5 text-left font-normal"
                  />
                }
              >
                <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                <span>
                  {checkIn && checkOut
                    ? `${format(parseISO(checkIn), 'LLL dd, y')} - ${format(parseISO(checkOut), 'LLL dd, y')}`
                    : checkIn
                      ? `From ${format(parseISO(checkIn), 'LLL dd, y')}`
                      : 'Select new stay dates'}
                </span>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Controller
                  control={control}
                  name="checkIn"
                  render={({ field }) => (
                    <Calendar
                      mode="range"
                      selected={{
                        from: checkIn ? parseISO(checkIn) : undefined,
                        to: checkOut ? parseISO(checkOut) : undefined,
                      }}
                      onSelect={(range) => {
                        if (range?.from)
                          field.onChange(format(range.from, 'yyyy-MM-dd'));
                        if (range?.to)
                          setValue('checkOut', format(range.to, 'yyyy-MM-dd'));
                        setQuoteRequest(null);
                      }}
                      numberOfMonths={1}
                    />
                  )}
                />
              </PopoverContent>
            </Popover>
          )}
        </Field>

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleFetchQuote}
            disabled={quoting || checkOut <= checkIn}
          >
            {quoting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Checking availability & prices...
              </>
            ) : (
              'Check availability & calculate price'
            )}
          </Button>
        </div>

        {/* Quote Comparison Results */}
        {quoteData && (
          <div className="bg-muted rounded-control border-line text-small space-y-3 border p-4">
            <h3 className="text-ink font-semibold">Stay Comparison</h3>

            {/* Price Difference Indicator */}
            <div className="border-line flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Previous Total:</span>
              <span className="text-ink font-medium">
                {formatNaira(quoteData.comparison.currentTotalMinor / 100)}
              </span>
            </div>
            <div className="border-line flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">New Total:</span>
              <span className="text-ink font-bold">
                {formatNaira(quoteData.comparison.newTotalMinor / 100)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-ink font-semibold">Outcome:</span>
              <span
                className={`font-bold ${
                  quoteData.comparison.guestOwesMinor > 0
                    ? 'text-brand-ink'
                    : quoteData.comparison.refundDueMinor > 0
                      ? 'text-success'
                      : 'text-muted-foreground'
                }`}
              >
                {quoteData.comparison.guestOwesMinor > 0
                  ? `Guest owes ${formatNaira(quoteData.comparison.guestOwesMinor / 100)}`
                  : quoteData.comparison.refundDueMinor > 0
                    ? `Refund due: ${formatNaira(quoteData.comparison.refundDueMinor / 100)}`
                    : 'No price difference'}
              </span>
            </div>

            {/* Room Availability Status */}
            <div className="border-line border-t pt-2">
              {!quoteData.currentRoomAvailable ? (
                <div className="space-y-2">
                  <div className="text-caption text-destructive flex items-start gap-2">
                    <AlertCircle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Room {reservation.roomNumber} is unavailable for these new
                      dates. Select an available room of the same type:
                    </span>
                  </div>

                  {quoteData.candidateRooms.length === 0 ? (
                    <p className="text-caption text-destructive font-semibold">
                      No rooms of this type are available for the new dates.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {quoteData.candidateRooms.map((r) => (
                        <Button
                          key={r.id}
                          type="button"
                          variant={
                            selectedRoomId === r.id ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() => setValue('roomId', r.id)}
                        >
                          Room {r.roomNumber}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-caption text-success flex items-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  <span>
                    Current room {reservation.roomNumber} is available for the
                    new dates.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager Override Controls */}
        <div className="border-line space-y-2 border-t pt-3">
          <Label
            htmlFor="override-rules-toggle"
            className="text-small text-ink flex cursor-pointer items-center gap-2"
          >
            <Controller
              control={control}
              name="overrideRules"
              render={({ field }) => (
                <Checkbox
                  id="override-rules-toggle"
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
            <span>Override hotel policies (min notice, same-day cut-off)</span>
          </Label>

          {overrideRules && (
            <div className="space-y-1.5 pt-2">
              <Field
                id="override-reason-input"
                label="Override Reason *"
                error={errors.overrideReason?.message}
              >
                {(a) => (
                  <Input
                    {...a}
                    {...register('overrideReason')}
                    type="text"
                    disabled={busy}
                    placeholder="e.g. VIP guest request approved by General Manager..."
                    className={inputClass(errors.overrideReason?.message)}
                  />
                )}
              </Field>
            </div>
          )}
        </div>

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
            size="sm"
            disabled={busy || !quoteData}
            loading={busy}
          >
            Confirm date change
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

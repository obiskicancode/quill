'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ServiceError } from '@/app/api/services/base.service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Field, inputClass } from '@/components/ui/form-field';
import { TextLink } from '@/components/ui/text-link';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useVerifyBooking } from '@/hooks/services/guest/use-verify-booking';
import { formatCountdown } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import {
  verifyRequestSchema,
  type VerifyRequest,
} from '@/schemas/booking.schema';
import type { GuestReservation } from '@/types/booking.types';

import { Button } from '../ui/button';
import { Input } from '../ui/input';

export type VerifyVariant = 'verify' | 'missing' | 'notfound';
const copy: Record<VerifyVariant, { title: string; text: string }> = {
  verify: {
    title: 'Verify your booking',
    text: 'For your privacy, enter your booking reference and the email you booked with to see your booking.',
  },
  missing: {
    title: 'Find your booking',
    text: 'Enter the booking reference from your confirmation email and the email you booked with.',
  },
  notfound: {
    title: ERROR_MESSAGES.COULD_NOT_FIND_BOOKING,
    text: 'Check the reference and the email you used, or message us and we will help. For your privacy we show the same message whether or not a booking exists.',
  },
};
interface VerifyFormProps {
  reference: string;
  variant: VerifyVariant;
  onVerified: (v: GuestReservation) => void;
  /** 'manage' opens a 30-minute management session. */
  scope?: 'view' | 'manage';
  /** A short notice above the form, for example "Your session ended". */
  notice?: string;
  /** Inside a dialog: no page container and a smaller heading. */
  embedded?: boolean;
}
type VerifyOutput = z.output<typeof verifyRequestSchema>;
/** States: idle, loading, one generic error, and a lockout with a countdown after too many tries. */
export function VerifyForm({
  reference,
  variant,
  onVerified,
  scope = 'view',
  notice,
  embedded = false,
}: VerifyFormProps) {
  const site = useSite();
  const verifyBooking = useVerifyBooking();
  const form = useForm<VerifyRequest, unknown, VerifyOutput>({
    resolver: zodResolver(verifyRequestSchema),
    defaultValues: { reference, email: '', scope },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    setError,
  } = form;
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useState(0);
  const busy = isSubmitting || verifyBooking.isPending;
  useEffect(() => {
    if (lockedFor <= 0) return;
    const id = window.setInterval(
      () => setLockedFor((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [lockedFor]);
  const onSubmit = async (input: VerifyOutput) => {
    if (lockedFor > 0) return;
    setServerError(null);
    try {
      const booking = await verifyBooking.mutateAsync(input);
      onVerified(booking);
    } catch (caught) {
      if (caught instanceof ServiceError && caught.status === 429) {
        setLockedFor(caught.body?.retryAfterSeconds ?? 600);
        setServerError(ERROR_MESSAGES.VERIFY_TOO_MANY_ATTEMPTS);
      } else if (caught instanceof ServiceError && caught.network) {
        setServerError(ERROR_MESSAGES.COULD_NOT_REACH_SERVER_CONNECTION);
      } else {
        applyServerFieldErrors(setError, caught);
        // One generic message for every other failure.
        setServerError(ERROR_MESSAGES.VERIFY_NOT_FOUND);
      }
    }
  };
  return (
    <div className={embedded ? '' : 'container-page max-w-xl py-10 md:py-16'}>
      {notice && (
        <div className="mb-6">
          <Alert role="status" variant="neutral" size="banner">
            <AlertTitle>{notice}</AlertTitle>
          </Alert>
        </div>
      )}
      {embedded ? (
        <h2 className="font-display text-h3">{copy[variant].title}</h2>
      ) : (
        <h1 className="font-display text-h2">{copy[variant].title}</h1>
      )}
      <p className="mt-3 text-body-lg text-ink/85">{copy[variant].text}</p>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
      >
        <Field
          id={`verify-reference${embedded ? '-embedded' : ''}`}
          label="Booking reference"
          error={errors.reference?.message}
          hint="For example QUILL-AB12CD"
        >
          {(a) => (
            <Input
              {...a}
              {...register('reference')}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={lockedFor > 0 || busy}
              className={`${inputClass(errors.reference?.message)} uppercase`}
            />
          )}
        </Field>
        <Field
          id={`verify-email${embedded ? '-embedded' : ''}`}
          label="Email used for the booking"
          error={errors.email?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={lockedFor > 0 || busy}
              className={inputClass(errors.email?.message)}
            />
          )}
        </Field>
        {serverError && (
          <Alert role="alert" variant="destructive" size="banner">
            <AlertTitle>
              {lockedFor > 0
                ? 'Please wait'
                : ERROR_MESSAGES.COULD_NOT_VERIFY_BOOKING}
            </AlertTitle>
            <AlertDescription>
              <p>
                {serverError}
                {lockedFor > 0
                  ? ` Try again in ${formatCountdown(lockedFor * 1000)}.`
                  : ''}
              </p>
            </AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={lockedFor > 0}
        >
          {lockedFor > 0
            ? `Locked for ${formatCountdown(lockedFor * 1000)}`
            : 'Verify and view booking'}
        </Button>
      </form>
      <p className="mt-6 text-small">
        <TextLink
          href={whatsappHref(site, 'Hello, I need help finding my booking.')}
          external
          className="inline-flex items-center gap-2"
        >
          <MessageCircle className="size-4" aria-hidden />
          Message the hotel on WhatsApp
          <span className="sr-only"> (opens in a new tab)</span>
        </TextLink>
      </p>
    </div>
  );
}

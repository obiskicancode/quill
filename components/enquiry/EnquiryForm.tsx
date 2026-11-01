'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { Field, inputClass } from '@/components/ui/form-field';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useSubmitEnquiry } from '@/hooks/services/content/use-submit-enquiry';
import { useFormDraft } from '@/hooks/use-form-draft';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  enquiryFormSchema,
  MAX_MESSAGE,
  type EnquiryFormInput,
  type EnquiryFormOutput,
} from '@/schemas/content.schema';
import type { DateRange, ISODate } from '@/types/dates.types';
import type { RoomType, StayParams } from '@/types/rooms.types';

import { Banner } from '../checkout/CheckoutStates';
import { DatePicker } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { FieldLegend, FieldSet } from '../ui/field';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { AvailabilityHint } from './AvailabilityHint';

type Failure = { kind: 'ratelimited' | 'error'; message: string };

interface EnquiryFormProps {
  rooms: RoomType[];
  responseHours: number;
  whatsappHref: string;
  /** A room slug from ?room= to pre-select. */
  initialRoom: string | null;
  /** Which page sent this enquiry. */
  sourcePage: string;
}

const ENQUIRY_DRAFT_EXCLUDE = [
  'consent',
] as const satisfies readonly (keyof EnquiryFormInput)[];

function formDefaults(roomType: string, sourcePage: string): EnquiryFormInput {
  return {
    name: '',
    email: '',
    phone: '',
    topic: 'booking_enquiry',
    subject: '',
    message: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    adults: '2',
    children: '0',
    roomType,
    source_page: sourcePage,
    consent: false,
  };
}

/**
 * Booking enquiry form. Same Zod schema as the server, and dates and guest numbers are required.
 * Nothing the guest types is ever lost: validation errors, rate limits and server failures all keep the form.
 */
export function EnquiryForm({
  rooms,
  responseHours,
  whatsappHref,
  initialRoom,
  sourcePage,
}: EnquiryFormProps) {
  const initialRoomType = rooms.some((room) => room.slug === initialRoom)
    ? (initialRoom as string)
    : '';
  const form = useForm<EnquiryFormInput, unknown, EnquiryFormOutput>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: formDefaults(initialRoomType, sourcePage),
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(form, 'public-enquiry', {
    exclude: ENQUIRY_DRAFT_EXCLUDE,
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setValue,
  } = form;
  const values = useWatch({ control }) as EnquiryFormInput;
  const submitEnquiry = useSubmitEnquiry();
  const [website, setWebsite] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [reference, setReference] = useState('');
  const key = useRef(newKey());
  const inFlight = useRef(false);
  const reduced = useReducedMotion();
  const busy = isSubmitting || submitEnquiry.isPending;

  const range: DateRange = {
    checkIn: (values.checkIn || null) as ISODate | null,
    checkOut: (values.checkOut || null) as ISODate | null,
  };
  const stay: StayParams | null =
    values.checkIn && values.checkOut && values.checkOut > values.checkIn
      ? {
          checkIn: values.checkIn as ISODate,
          checkOut: values.checkOut as ISODate,
          adults: Number(values.adults) || 0,
          children: Number(values.children) || 0,
        }
      : null;

  const onSubmit = async (input: EnquiryFormOutput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    try {
      const data = await submitEnquiry.mutateAsync({
        ...input,
        idempotencyKey: key.current,
        website,
      });
      clearDraft();
      setReference(data.reference);
    } catch (e) {
      if (applyServerFieldErrors(form.setError, e)) {
        setFailure(null);
      } else {
        const err = e instanceof ServiceError ? e : null;
        if (err?.status === 429) {
          setFailure({
            kind: 'ratelimited',
            message: err.body?.message ?? ERROR_MESSAGES.ENQUIRY_RATE_LIMITED,
          });
        } else if (err?.network) {
          setFailure({
            kind: 'error',
            message: ERROR_MESSAGES.COULD_NOT_REACH_SERVER,
          });
        } else {
          setFailure({
            kind: 'error',
            message:
              err?.body?.message ??
              err?.message ??
              ERROR_MESSAGES.COULD_NOT_SEND_ENQUIRY,
          });
        }
      }
    } finally {
      inFlight.current = false;
    }
  };
  const submit = (event?: React.SubmitEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit)(event);
  };

  function reset() {
    key.current = newKey();
    submitEnquiry.reset();
    setReference('');
    setFailure(null);
    setWebsite('');
    form.reset(formDefaults(initialRoomType, sourcePage));
    clearDraft();
  }

  const validateDates = form.formState.isSubmitted;
  const setDates = (next: DateRange) => {
    setValue('checkIn', next.checkIn ?? '', {
      shouldDirty: true,
      shouldValidate: validateDates,
    });
    setValue('checkOut', next.checkOut ?? '', {
      shouldDirty: true,
      shouldValidate: validateDates,
    });
  };
  const dateError = errors.checkIn?.message || errors.checkOut?.message;

  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      };

  const successPanel = (
    <div
      role="status"
      className="rounded-card border-line bg-card shadow-raised space-y-5 border p-8"
    >
      <CheckCircle2 className="text-brand-ink size-10" aria-hidden />
      <h2 id="enquiry-form-title" className="font-display text-h2">
        Thanks, we&rsquo;ll be in touch within {responseHours}{' '}
        {responseHours === 1 ? 'hour' : 'hours'}
      </h2>
      <p className="text-ink/85">
        Your enquiry reference is{' '}
        <span className="font-semibold">{reference}</span>. We have emailed you
        a copy.
      </p>
      <p className="text-small text-ink/85">
        Need an answer sooner? Message us on WhatsApp.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink
          href={whatsappHref}
          variant="whatsapp"
          icon={<MessageCircle className="size-5" aria-hidden />}
        >
          Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
        <Button variant="secondary" onClick={reset}>
          Send another enquiry
        </Button>
      </div>
    </div>
  );

  return (
    <section
      id="enquiry"
      aria-labelledby="enquiry-form-title"
      className="space-y-6"
    >
      <AnimatePresence mode="wait" initial={false}>
        {reference ? (
          <motion.div
            key="success"
            {...panelMotion}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            {successPanel}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            {...panelMotion}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <h2 id="enquiry-form-title" className="font-display text-h2">
              Send us a booking enquiry
            </h2>
            <p className="text-body-lg text-ink/85 mt-3">
              Tell us your dates and we&rsquo;ll confirm availability within{' '}
              {responseHours} {responseHours === 1 ? 'hour' : 'hours'}.
            </p>

            <div className="mt-6 space-y-6" aria-live="polite">
              {failure?.kind === 'ratelimited' && (
                <Banner role="alert" tone="warn" title="Please wait a little">
                  <p>{failure.message} Your enquiry is kept below.</p>
                </Banner>
              )}
              {failure?.kind === 'error' && (
                <Banner
                  role="alert"
                  tone="danger"
                  title={ERROR_MESSAGES.ENQUIRY_NOT_SENT}
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void submit()}
                    >
                      Try again
                    </Button>
                  }
                >
                  <p>
                    {failure.message} Your enquiry is kept below. Trying again
                    is safe: it will not send twice.
                  </p>
                </Banner>
              )}
            </div>

            <form noValidate onSubmit={submit} className="mt-8 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="enquiry-name"
                  label="Name"
                  error={errors.name?.message}
                >
                  {(a) => (
                    <Input
                      {...a}
                      {...register('name')}
                      type="text"
                      autoComplete="name"
                      disabled={busy}
                      className={inputClass(errors.name?.message)}
                    />
                  )}
                </Field>
                <Field
                  id="enquiry-email"
                  label="Email"
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
                      disabled={busy}
                      className={inputClass(errors.email?.message)}
                    />
                  )}
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="enquiry-phone"
                  label="Phone"
                  optional
                  error={errors.phone?.message}
                  hint="Add the country code if it is not a Nigerian number."
                >
                  {(a) => (
                    <Input
                      {...a}
                      {...register('phone')}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      disabled={busy}
                      className={inputClass(errors.phone?.message)}
                    />
                  )}
                </Field>
                <Field
                  id="enquiry-roomType"
                  label="Preferred room type"
                  optional
                  error={errors.roomType?.message}
                >
                  {(a) => (
                    <Controller
                      control={control}
                      name="roomType"
                      render={({ field }) => (
                        <Select
                          items={[
                            { value: '', label: 'No preference' },
                            ...rooms.map((room) => ({
                              value: room.slug,
                              label: room.name,
                            })),
                          ]}
                          value={field.value}
                          onValueChange={(value) => field.onChange(value ?? '')}
                          disabled={busy}
                        >
                          <SelectTrigger
                            id={a.id}
                            aria-describedby={a['aria-describedby']}
                            aria-invalid={a['aria-invalid']}
                            onBlur={field.onBlur}
                            className={inputClass(errors.roomType?.message)}
                          >
                            <SelectValue placeholder="No preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No preference</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.slug} value={room.slug}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </Field>
              </div>

              <FieldSet className="rounded-card border-line bg-card space-y-5 border p-5">
                <FieldLegend className="px-2 font-semibold">
                  Your stay
                </FieldLegend>
                <div>
                  <span
                    id="enquiry-dates-label"
                    className="text-small mb-1.5 block font-semibold"
                  >
                    Dates
                  </span>
                  <div
                    aria-labelledby="enquiry-dates-label"
                    aria-describedby={
                      dateError ? 'enquiry-dates-error' : undefined
                    }
                    aria-invalid={dateError ? true : undefined}
                  >
                    <DatePicker
                      value={range}
                      monthsShown={1}
                      onChange={setDates}
                    />
                  </div>
                  {dateError && (
                    <p
                      id="enquiry-dates-error"
                      className="text-small text-destructive mt-1.5 font-medium"
                    >
                      {dateError}
                    </p>
                  )}
                </div>
                <div className="divide-line border-line divide-y border-t">
                  <GuestStepper
                    label="Adults"
                    hint="Ages 18 or above"
                    min={1}
                    max={12}
                    value={Number(values.adults) || 0}
                    onChange={(count) =>
                      setValue('adults', String(count), {
                        shouldDirty: true,
                        shouldValidate: validateDates,
                      })
                    }
                  />
                  <GuestStepper
                    label="Children"
                    hint="Ages 0 to 17"
                    min={0}
                    max={8}
                    value={Number(values.children) || 0}
                    onChange={(count) =>
                      setValue('children', String(count), {
                        shouldDirty: true,
                        shouldValidate: validateDates,
                      })
                    }
                  />
                </div>
                <AvailabilityHint
                  rooms={rooms}
                  roomSlug={values.roomType ?? ''}
                  stay={stay}
                />
              </FieldSet>

              <Field
                id="enquiry-message"
                label="Message"
                error={errors.message?.message}
                hint={`${(values.message?.length ?? 0).toLocaleString('en-NG')} / ${MAX_MESSAGE.toLocaleString('en-NG')} characters`}
              >
                {(a) => (
                  <Textarea
                    {...a}
                    {...register('message')}
                    rows={6}
                    maxLength={MAX_MESSAGE + 200}
                    autoComplete="off"
                    placeholder="Anything we should know about your stay?"
                    disabled={busy}
                    className={`${inputClass(errors.message?.message)} py-3`}
                  />
                )}
              </Field>

              {/* Honeypot: hidden from people and assistive tech. Bots fill it in. */}
              <div
                aria-hidden
                className="absolute left-[-624.9375rem] h-0 w-0 overflow-hidden"
              >
                <Label htmlFor="enquiry-website-honeypot">Website</Label>
                <Input
                  id="enquiry-website-honeypot"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <div>
                <div className="flex items-start gap-3 py-1">
                  <Controller
                    control={control}
                    name="consent"
                    render={({ field }) => (
                      <Checkbox
                        id="enquiry-consent"
                        name={field.name}
                        ref={field.ref}
                        checked={field.value === true}
                        disabled={busy}
                        aria-invalid={errors.consent ? true : undefined}
                        aria-describedby={
                          errors.consent ? 'enquiry-consent-error' : undefined
                        }
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        onBlur={field.onBlur}
                        className="mt-0.5"
                      />
                    )}
                  />
                  <Label
                    htmlFor="enquiry-consent"
                    className="text-small cursor-pointer leading-relaxed font-normal"
                  >
                    I agree to the{' '}
                    <Link
                      href="/policies/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
                    >
                      Privacy Policy
                      <span className="sr-only"> (opens in a new tab)</span>
                    </Link>{' '}
                    so the hotel can reply to me.
                  </Label>
                </div>
                {errors.consent && (
                  <p
                    id="enquiry-consent-error"
                    className="text-small text-destructive mt-1.5 font-medium"
                  >
                    {errors.consent.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={busy}
                disabled={failure?.kind === 'ratelimited'}
              >
                {busy ? 'Sending' : 'Send enquiry'}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useRef, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { contentService } from '@/app/api/services/content.service';
import type { ISODate } from '@/lib/dates';
import type { RoomType, StayParams } from '@/lib/rooms';
import { enquiryFormSchema, MAX_MESSAGE } from '@/schemas/content.schema';

import { Banner } from '../checkout/CheckoutStates';
import { Field, inputClass } from '../checkout/Field';
import { DatePicker, type DateRange } from '../DatePicker';
import { GuestStepper } from '../GuestStepper';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/Button';
import { AvailabilityHint } from './AvailabilityHint';

type FieldName =
  | 'name'
  | 'email'
  | 'phone'
  | 'roomType'
  | 'checkIn'
  | 'checkOut'
  | 'adults'
  | 'children'
  | 'message'
  | 'consent';
type Status = 'idle' | 'submitting' | 'success' | 'ratelimited' | 'error';

interface EnquiryFormProps {
  rooms: RoomType[];
  responseHours: number;
  whatsappHref: string;
  /** A room slug from ?room= to pre-select. */
  initialRoom: string | null;
  /** Which page sent this enquiry. */
  sourcePage: string;
}

type FormValues = {
  name: string;
  email: string;
  phone: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  message: string;
  consent: boolean;
};

/** The booking enquiry always uses the same topic, so the form never asks for it. */
function build(v: FormValues, sourcePage: string) {
  return {
    name: v.name,
    email: v.email,
    phone: v.phone,
    subject: '',
    topic: 'booking_enquiry' as const,
    message: v.message,
    checkIn: v.checkIn,
    checkOut: v.checkOut,
    guests: '',
    adults: v.adults,
    children: v.children,
    roomType: v.roomType,
    source_page: sourcePage,
    consent: v.consent,
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
  const source = sourcePage;
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    roomType: rooms.some((r) => r.slug === initialRoom)
      ? (initialRoom as string)
      : '',
    checkIn: '',
    checkOut: '',
    adults: '2',
    children: '0',
    message: '',
    consent: false,
  });
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const [reference, setReference] = useState('');
  const key = useRef(newKey());
  const submitting = useRef(false);
  const reduced = useReducedMotion();

  const parse = (v: typeof values) => {
    const r = enquiryFormSchema.safeParse(build(v, source));
    const out: Partial<Record<FieldName, string>> = {};
    if (!r.success)
      for (const i of r.error.issues) out[i.path[0] as FieldName] ??= i.message;
    return out;
  };

  const set = (name: FieldName, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const blur = (name: FieldName) =>
    setErrors((e) => ({ ...e, [name]: parse(values)[name] }));
  const bind = (
    name: Exclude<
      FieldName,
      'consent' | 'adults' | 'children' | 'checkIn' | 'checkOut'
    >,
  ) => ({
    name,
    value: values[name],
    disabled: status === 'submitting',
    onChange: (e: { target: { value: string } }) => set(name, e.target.value),
    onBlur: () => blur(name),
  });

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

  async function submit() {
    if (submitting.current) return;
    const found = parse(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    submitting.current = true;
    setStatus('submitting');
    try {
      const { data } = await contentService.sendEnquiry({
        ...build(values, source),
        idempotencyKey: key.current,
        website,
      });
      setReference(data.reference);
      setStatus('success');
    } catch (e) {
      const err = e instanceof ServiceError ? e : null;
      if (err?.status === 422 && err.body?.fieldErrors) {
        setErrors(err.body.fieldErrors as Partial<Record<FieldName, string>>);
        setStatus('idle');
      } else if (err?.status === 429) {
        setServerMessage(
          err.body?.message ??
            'Please wait a few minutes before sending another enquiry.',
        );
        setStatus('ratelimited');
      } else if (err?.network) {
        setServerMessage("We couldn't reach the server.");
        setStatus('error');
      } else {
        setServerMessage(
          err?.body?.message ??
            err?.message ??
            "We couldn't send your enquiry.",
        );
        setStatus('error');
      }
    } finally {
      submitting.current = false;
    }
  }

  function reset() {
    key.current = newKey();
    setValues((v) => ({
      ...v,
      name: '',
      email: '',
      phone: '',
      message: '',
      checkIn: '',
      checkOut: '',
      adults: '2',
      children: '0',
      consent: false,
    }));
    setErrors({});
    setStatus('idle');
  }

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
      className="rounded-card border-line bg-surface shadow-raised space-y-5 border p-8"
    >
      <CheckCircle2 className="text-accent-ink size-10" aria-hidden />
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
        {status === 'success' ? (
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
              {status === 'ratelimited' && (
                <Banner role="alert" tone="warn" title="Please wait a little">
                  <p>{serverMessage} Your enquiry is kept below.</p>
                </Banner>
              )}
              {status === 'error' && (
                <Banner
                  role="alert"
                  tone="danger"
                  title="Your enquiry was not sent"
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
                    {serverMessage} Your enquiry is kept below. Trying again is
                    safe: it will not send twice.
                  </p>
                </Banner>
              )}
            </div>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="mt-8 space-y-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="enquiry-name" label="Name" error={errors.name}>
                  {(a) => (
                    <input
                      {...a}
                      {...bind('name')}
                      type="text"
                      autoComplete="name"
                      className={inputClass(errors.name)}
                    />
                  )}
                </Field>
                <Field id="enquiry-email" label="Email" error={errors.email}>
                  {(a) => (
                    <input
                      {...a}
                      {...bind('email')}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={inputClass(errors.email)}
                    />
                  )}
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="enquiry-phone"
                  label="Phone"
                  optional
                  error={errors.phone}
                  hint="Add the country code if it is not a Nigerian number."
                >
                  {(a) => (
                    <input
                      {...a}
                      {...bind('phone')}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputClass(errors.phone)}
                    />
                  )}
                </Field>
                <Field
                  id="enquiry-roomType"
                  label="Preferred room type"
                  optional
                  error={errors.roomType}
                >
                  {(a) => (
                    <select
                      {...a}
                      {...bind('roomType')}
                      className={inputClass(errors.roomType)}
                    >
                      <option value="">No preference</option>
                      {rooms.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              <fieldset className="rounded-card border-line bg-surface space-y-5 border p-5">
                <legend className="px-2 font-semibold">Your stay</legend>
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
                      errors.checkIn || errors.checkOut
                        ? 'enquiry-dates-error'
                        : undefined
                    }
                    aria-invalid={
                      errors.checkIn || errors.checkOut ? true : undefined
                    }
                  >
                    <DatePicker
                      value={range}
                      monthsShown={1}
                      onChange={(next) => {
                        set('checkIn', next.checkIn ?? '');
                        set('checkOut', next.checkOut ?? '');
                      }}
                    />
                  </div>
                  {(errors.checkIn || errors.checkOut) && (
                    <p
                      id="enquiry-dates-error"
                      className="text-small text-danger mt-1.5 font-medium"
                    >
                      {errors.checkIn || errors.checkOut}
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
                    onChange={(n) => set('adults', String(n))}
                  />
                  <GuestStepper
                    label="Children"
                    hint="Ages 0 to 17"
                    min={0}
                    max={8}
                    value={Number(values.children) || 0}
                    onChange={(n) => set('children', String(n))}
                  />
                </div>
                <AvailabilityHint
                  rooms={rooms}
                  roomSlug={values.roomType}
                  stay={stay}
                />
              </fieldset>

              <Field
                id="enquiry-message"
                label="Message"
                error={errors.message}
                hint={`${values.message.length.toLocaleString('en-NG')} / ${MAX_MESSAGE.toLocaleString('en-NG')} characters`}
              >
                {(a) => (
                  <textarea
                    {...a}
                    {...bind('message')}
                    rows={6}
                    maxLength={MAX_MESSAGE + 200}
                    autoComplete="off"
                    placeholder="Anything we should know about your stay?"
                    className={`${inputClass(errors.message)} py-3`}
                  />
                )}
              </Field>

              {/* Honeypot: hidden from people and assistive tech. Bots fill it in. */}
              <div
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
              >
                <label>
                  Website
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              <div>
                <label className="flex cursor-pointer items-start gap-3 py-1">
                  <input
                    id="enquiry-consent"
                    type="checkbox"
                    checked={values.consent}
                    disabled={status === 'submitting'}
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={
                      errors.consent ? 'enquiry-consent-error' : undefined
                    }
                    onChange={(e) => set('consent', e.target.checked)}
                    className="accent-ink mt-0.5 size-6 shrink-0"
                  />
                  <span className="text-small">
                    I agree to the{' '}
                    <Link
                      href="/policies/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="decoration-accent font-semibold underline decoration-2 underline-offset-4"
                    >
                      Privacy Policy
                      <span className="sr-only"> (opens in a new tab)</span>
                    </Link>{' '}
                    so the hotel can reply to me.
                  </span>
                </label>
                {errors.consent && (
                  <p
                    id="enquiry-consent-error"
                    className="text-small text-danger mt-1.5 font-medium"
                  >
                    {errors.consent}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={status === 'submitting'}
                disabled={status === 'ratelimited'}
              >
                {status === 'submitting' ? 'Sending' : 'Send enquiry'}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { Field, inputClass } from '@/components/ui/form-field';
import { CONTACT_TOPICS } from '@/constants/content';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useSubmitEnquiry } from '@/hooks/services/content/use-submit-enquiry';
import { useFormDraft } from '@/hooks/use-form-draft';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  enquiryFormSchema,
  MAX_MESSAGE,
  normalizeTopic,
  STAY_TOPICS,
  topicLabels,
  type EnquiryFormInput,
  type EnquiryFormOutput,
} from '@/schemas/content.schema';
import type { EnquiryTopic } from '@/types/content.types';

import { Banner } from '../checkout/CheckoutStates';
import { Reveal } from '../motion';
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

type Failure = { kind: 'ratelimited' | 'error'; message: string };

interface ContactFormProps {
  initialTopic: string | null;
  /** A room slug from ?room=. */
  initialRoom: string | null;
  /** A booking reference from older links. It is put at the top of the message. */
  initialRef: string | null;
  rooms: { slug: string; name: string }[];
  responseHours: number;
  whatsappHref: string;
}

/** A topic the contact form can actually show (the booking enquiry has its own page). */
function contactTopic(raw: string | null): EnquiryTopic {
  const topic = normalizeTopic(raw);
  return (CONTACT_TOPICS as readonly EnquiryTopic[]).includes(topic)
    ? topic
    : 'general';
}

const CONTACT_DRAFT_EXCLUDE = [
  'consent',
] as const satisfies readonly (keyof EnquiryFormInput)[];

const emptySubscribe = () => () => {};
const getToday = () => new Date().toISOString().slice(0, 10);
const getEmptySnapshot = () => '';

function formDefaults(
  topic: EnquiryTopic,
  roomType: string,
  message: string,
): EnquiryFormInput {
  return {
    name: '',
    email: '',
    phone: '',
    topic,
    subject: '',
    message,
    checkIn: '',
    checkOut: '',
    guests: '',
    adults: '',
    children: '',
    roomType,
    source_page: '',
    consent: false,
  };
}

export function ContactForm({
  initialTopic,
  initialRoom,
  initialRef,
  rooms,
  responseHours,
  whatsappHref,
}: ContactFormProps) {
  const safeRef =
    initialRef && /^[A-Za-z0-9-]{4,30}$/.test(initialRef) ? initialRef : null;
  const initialRoomType = rooms.some((room) => room.slug === initialRoom)
    ? (initialRoom as string)
    : '';
  const initialMessage = safeRef ? `Booking reference: ${safeRef}\n\n` : '';
  const defaults = () =>
    formDefaults(contactTopic(initialTopic), initialRoomType, initialMessage);
  const form = useForm<EnquiryFormInput, unknown, EnquiryFormOutput>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: defaults(),
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(form, 'public-contact', {
    exclude: CONTACT_DRAFT_EXCLUDE,
  });
  const {
    control,
    formState: { errors, isSubmitting },
    register,
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
  const showStay = STAY_TOPICS.includes(values.topic);

  // Read the clock only on the client so the server and the first client
  // render agree; the date is only used as a `min` on the date inputs.
  const today = useSyncExternalStore(
    emptySubscribe,
    getToday,
    getEmptySnapshot,
  );

  const onSubmit = async (input: EnquiryFormOutput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    const includeStay = STAY_TOPICS.includes(input.topic);
    try {
      const data = await submitEnquiry.mutateAsync({
        ...input,
        ...(includeStay
          ? {}
          : { checkIn: '', checkOut: '', guests: '', roomType: '' }),
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
            message: err.body?.message ?? ERROR_MESSAGES.CONTACT_RATE_LIMITED,
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
              ERROR_MESSAGES.COULD_NOT_SEND_MESSAGE,
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
    form.reset(defaults());
    clearDraft();
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
      className="rounded-card border-line bg-card shadow-raised space-y-5 border p-8"
    >
      <CheckCircle2 className="text-brand-ink size-10" aria-hidden />
      <h2 id="form-title" className="font-display text-h2">
        Thanks, we&rsquo;ll reply within {responseHours}{' '}
        {responseHours === 1 ? 'hour' : 'hours'}
      </h2>
      <p className="text-ink/85">
        Your message reference is{' '}
        <span className="font-semibold">{reference}</span>. We have emailed you
        a copy.
      </p>
      <p className="text-small text-ink/85">
        Need an answer sooner? Message us on WhatsApp.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink
          href={whatsappHref}
          external
          variant="whatsapp"
          icon={<MessageCircle className="size-5" aria-hidden />}
        >
          Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
        <Button variant="secondary" onClick={reset}>
          Send another message
        </Button>
      </div>
    </div>
  );

  return (
    <section id="enquiry" aria-labelledby="form-title" className="section-y">
      <div className="container-page max-w-3xl">
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
              <h2 id="form-title" className="font-display text-h2">
                Send us a message
              </h2>
              <p className="text-body-lg text-ink/85 mt-3">
                We reply within {responseHours}{' '}
                {responseHours === 1 ? 'hour' : 'hours'}.
              </p>

              <div className="mt-6 space-y-6" aria-live="polite">
                {failure?.kind === 'ratelimited' && (
                  <Banner role="alert" tone="warn" title="Please wait a little">
                    <p>{failure.message} Your message is kept below.</p>
                  </Banner>
                )}
                {failure?.kind === 'error' && (
                  <Banner
                    role="alert"
                    tone="danger"
                    title={ERROR_MESSAGES.MESSAGE_NOT_SENT}
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
                      {failure.message} Your message is kept below. Trying again
                      is safe: it will not send twice.
                    </p>
                  </Banner>
                )}
              </div>

              <form noValidate onSubmit={submit} className="mt-8 space-y-5">
                <Reveal className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="contact-name"
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
                    id="contact-email"
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
                </Reveal>
                <Reveal delay={0.05} className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="contact-phone"
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
                    id="contact-topic"
                    label="What is this about?"
                    error={errors.topic?.message}
                  >
                    {(a) => (
                      <Controller
                        control={control}
                        name="topic"
                        render={({ field }) => (
                          <Select
                            items={CONTACT_TOPICS.map((topic) => ({
                              value: topic,
                              label: topicLabels[topic],
                            }))}
                            value={field.value}
                            onValueChange={(value) =>
                              field.onChange(
                                (value ?? 'general') as EnquiryTopic,
                              )
                            }
                            disabled={busy}
                          >
                            <SelectTrigger
                              id={a.id}
                              aria-describedby={a['aria-describedby']}
                              aria-invalid={a['aria-invalid']}
                              onBlur={field.onBlur}
                              className={inputClass(errors.topic?.message)}
                            >
                              <SelectValue placeholder="Select topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_TOPICS.map((topic) => (
                                <SelectItem key={topic} value={topic}>
                                  {topicLabels[topic]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </Field>
                </Reveal>
                <Field
                  id="contact-subject"
                  label="Subject"
                  optional
                  error={errors.subject?.message}
                >
                  {(a) => (
                    <Input
                      {...a}
                      {...register('subject')}
                      type="text"
                      autoComplete="off"
                      disabled={busy}
                      className={inputClass(errors.subject?.message)}
                    />
                  )}
                </Field>

                {showStay && (
                  <FieldSet className="rounded-card border-line bg-card space-y-5 border p-5">
                    <FieldLegend className="px-2 font-semibold">
                      Your stay (optional)
                    </FieldLegend>
                    <Reveal delay={0.1} className="grid gap-5 md:grid-cols-2">
                      <Field
                        id="contact-checkIn"
                        label="Check-in"
                        optional
                        error={errors.checkIn?.message}
                      >
                        {(a) => (
                          <Input
                            {...a}
                            {...register('checkIn')}
                            type="date"
                            min={today || undefined}
                            disabled={busy}
                            className={inputClass(errors.checkIn?.message)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-checkOut"
                        label="Check-out"
                        optional
                        error={errors.checkOut?.message}
                      >
                        {(a) => (
                          <Input
                            {...a}
                            {...register('checkOut')}
                            type="date"
                            min={values.checkIn || today || undefined}
                            disabled={busy}
                            className={inputClass(errors.checkOut?.message)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-guests"
                        label="Number of guests"
                        optional
                        error={errors.guests?.message}
                      >
                        {(a) => (
                          <Input
                            {...a}
                            {...register('guests')}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            disabled={busy}
                            className={inputClass(errors.guests?.message)}
                          />
                        )}
                      </Field>
                      <Field
                        id="contact-roomType"
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
                                onValueChange={(value) =>
                                  field.onChange(value ?? '')
                                }
                                disabled={busy}
                              >
                                <SelectTrigger
                                  id={a.id}
                                  aria-describedby={a['aria-describedby']}
                                  aria-invalid={a['aria-invalid']}
                                  onBlur={field.onBlur}
                                  className={inputClass(
                                    errors.roomType?.message,
                                  )}
                                >
                                  <SelectValue placeholder="No preference" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">
                                    No preference
                                  </SelectItem>
                                  {rooms.map((room) => (
                                    <SelectItem
                                      key={room.slug}
                                      value={room.slug}
                                    >
                                      {room.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        )}
                      </Field>
                    </Reveal>
                  </FieldSet>
                )}

                <Field
                  id="contact-message"
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
                  <Label htmlFor="contact-website-honeypot">Website</Label>
                  <Input
                    id="contact-website-honeypot"
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
                          id="contact-consent"
                          name={field.name}
                          ref={field.ref}
                          checked={field.value === true}
                          disabled={busy}
                          aria-invalid={errors.consent ? true : undefined}
                          aria-describedby={
                            errors.consent ? 'contact-consent-error' : undefined
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
                      htmlFor="contact-consent"
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
                      id="contact-consent-error"
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
                  {busy ? 'Sending' : 'Send message'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Field, inputClass } from '@/components/ui/form-field';
import { SuccessMark } from '@/components/ui/icon-badge';
import { TextLink } from '@/components/ui/text-link';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useSubmitEnquiry } from '@/hooks/services/content/use-submit-enquiry';
import { useFormDraft } from '@/hooks/use-form-draft';
import { focusFirstInvalid } from '@/lib/forms/focus-first-invalid';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import {
  enquiryFormSchema,
  MAX_MESSAGE,
  type EnquiryFormInput,
  type EnquiryFormOutput,
} from '@/schemas/content.schema';
import type { DateRange, ISODate } from '@/types/dates.types';

import { DatePicker } from '../DatePicker';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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

export interface EnquiryFormCopy {
  title: string;
  intro: (hours: string) => string;
  successTitle: (hours: string) => string;
  noun: string;
  submitLabel: string;
  anotherLabel: string;
  notSentTitle: string;
  rateLimitedMessage: string;
  couldNotSendFallback: string;
  messagePlaceholder?: string;
}

export interface EnquiryFormShellContext {
  fieldId: (slot: string) => string;
  control: Control<EnquiryFormInput>;
  register: UseFormRegister<EnquiryFormInput>;
  setValue: UseFormSetValue<EnquiryFormInput>;
  values: EnquiryFormInput;
  errors: FieldErrors<EnquiryFormInput>;
  busy: boolean;
  submitted: boolean;
  dates: ReactNode;
}

export interface EnquiryFormShellProps {
  idPrefix: string;
  sectionId: string;
  sectionClassName: string;
  containerClassName?: string;
  draftKey: string;
  defaults: () => EnquiryFormInput;
  responseHours: number;
  whatsappHref: string;
  whatsappExternal?: boolean;
  copy: EnquiryFormCopy;
  /** What the page sends after the shell validates: drop fields the page never showed. */
  prepare?: (input: EnquiryFormOutput) => EnquiryFormOutput;
  renderAfterPhone?: (ctx: EnquiryFormShellContext) => ReactNode;
  renderBeforeStay?: (ctx: EnquiryFormShellContext) => ReactNode;
  renderStay?: (ctx: EnquiryFormShellContext) => ReactNode;
}

const DRAFT_EXCLUDE = [
  'consent',
] as const satisfies readonly (keyof EnquiryFormInput)[];

/**
 * Shared enquiry form shell: persisted draft, validation, submission and
 * success handling for contact and group/event enquiries.
 */
export function EnquiryFormShell({
  idPrefix,
  sectionId,
  sectionClassName,
  containerClassName,
  draftKey,
  defaults,
  responseHours,
  whatsappHref,
  whatsappExternal,
  copy,
  prepare,
  renderAfterPhone,
  renderBeforeStay,
  renderStay,
}: EnquiryFormShellProps) {
  const form = useForm<EnquiryFormInput, unknown, EnquiryFormOutput>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: defaults(),
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(form, draftKey, {
    exclude: DRAFT_EXCLUDE,
  });
  const {
    control,
    formState: { errors, isSubmitted, isSubmitting },
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
  const fieldId = (slot: string) => `${idPrefix}-${slot}`;
  const titleId = fieldId('form-title');
  const hours = `${responseHours} ${responseHours === 1 ? 'hour' : 'hours'}`;
  const range: DateRange = {
    checkIn: (values.checkIn || null) as ISODate | null,
    checkOut: (values.checkOut || null) as ISODate | null,
  };
  const dateError = errors.checkIn?.message || errors.checkOut?.message;
  const setDates = (next: DateRange) => {
    setValue('checkIn', next.checkIn ?? '', {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
    setValue('checkOut', next.checkOut ?? '', {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
  };
  const dates = (
    <div>
      <span
        id={fieldId('dates-label')}
        className="mb-1.5 block text-small font-semibold"
      >
        Dates
      </span>
      <div
        id={fieldId('dates')}
        aria-labelledby={fieldId('dates-label')}
        aria-describedby={dateError ? fieldId('dates-error') : undefined}
        aria-invalid={dateError ? true : undefined}
      >
        <DatePicker value={range} monthsShown={1} onChange={setDates} />
      </div>
      {dateError && (
        <p
          id={fieldId('dates-error')}
          className="mt-1.5 text-small font-medium text-destructive"
        >
          {dateError}
        </p>
      )}
    </div>
  );
  const ctx: EnquiryFormShellContext = {
    fieldId,
    control,
    register,
    setValue,
    values,
    errors,
    busy,
    submitted: isSubmitted,
    dates,
  };
  const onSubmit = async (input: EnquiryFormOutput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    try {
      const data = await submitEnquiry.mutateAsync({
        ...(prepare ? prepare(input) : input),
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
            message: err.body?.message ?? copy.rateLimitedMessage,
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
              err?.body?.message ?? err?.message ?? copy.couldNotSendFallback,
          });
        }
      }
    } finally {
      inFlight.current = false;
    }
  };
  const submit = (event?: React.SubmitEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit, (invalid) => {
      focusFirstInvalid(fieldId, invalid);
    })(event);
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
    <Card render={<div role="status" />} className="gap-5 p-8 text-body">
      <SuccessMark />
      <h2 id={titleId} className="font-display text-h2">
        {copy.successTitle(hours)}
      </h2>
      <p className="text-ink/85">
        Your {copy.noun} reference is{' '}
        <span className="font-semibold">{reference}</span>. We have emailed you
        a copy.
      </p>
      <p className="text-small text-ink/85">
        Need an answer sooner? Message us on WhatsApp.
      </p>
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
        <ButtonLink
          href={whatsappHref}
          external={whatsappExternal}
          variant="whatsapp"
          icon={<MessageCircle className="size-5" aria-hidden />}
        >
          Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
        <Button variant="secondary" onClick={reset}>
          {copy.anotherLabel}
        </Button>
      </div>
    </Card>
  );
  const formPanel = (
    <>
      <h2 id={titleId} className="font-display text-h2">
        {copy.title}
      </h2>
      <p className="mt-3 text-body-lg text-ink/85">{copy.intro(hours)}</p>
      <div className="mt-6 space-y-6" aria-live="polite">
        {failure?.kind === 'ratelimited' && (
          <Alert role="alert" variant="warning" size="banner">
            <AlertTitle>Please wait a little</AlertTitle>
            <AlertDescription>
              <p>
                {failure.message} Your {copy.noun} is kept below.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {failure?.kind === 'error' && (
          <Alert role="alert" variant="destructive" size="banner">
            <AlertTitle>{copy.notSentTitle}</AlertTitle>
            <AlertDescription>
              <p>
                {failure.message} Your {copy.noun} is kept below. Trying again
                is safe: it will not send twice.
              </p>
            </AlertDescription>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void submit()}
              >
                Try again
              </Button>
            </div>
          </Alert>
        )}
      </div>
      <form noValidate onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id={fieldId('name')} label="Name" error={errors.name?.message}>
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
            id={fieldId('email')}
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
            id={fieldId('phone')}
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
          {renderAfterPhone?.(ctx)}
        </div>
        {renderBeforeStay?.(ctx)}
        {renderStay?.(ctx)}
        <Field
          id={fieldId('message')}
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
              placeholder={copy.messagePlaceholder}
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
          <Label htmlFor={fieldId('website-honeypot')}>Website</Label>
          <Input
            id={fieldId('website-honeypot')}
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
                  id={fieldId('consent')}
                  name={field.name}
                  ref={field.ref}
                  checked={field.value === true}
                  disabled={busy}
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={
                    errors.consent ? fieldId('consent-error') : undefined
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
              htmlFor={fieldId('consent')}
              className="cursor-pointer text-small leading-relaxed font-normal"
            >
              I agree to the{' '}
              <TextLink href="/policies/privacy" external>
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </TextLink>{' '}
              so the hotel can reply to me.
            </Label>
          </div>
          {errors.consent && (
            <p
              id={fieldId('consent-error')}
              className="mt-1.5 text-small font-medium text-destructive"
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
          {busy ? 'Sending' : copy.submitLabel}
        </Button>
      </form>
    </>
  );
  const panel = (
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
          {formPanel}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      className={sectionClassName}
    >
      {containerClassName ? (
        <div className={containerClassName}>{panel}</div>
      ) : (
        panel
      )}
    </section>
  );
}

/** Preferred room type, shared by both pages. */
export function RoomTypeField({
  ctx,
  rooms,
}: {
  ctx: EnquiryFormShellContext;
  rooms: { slug: string; name: string }[];
}) {
  const error = ctx.errors.roomType?.message;
  return (
    <Field
      id={ctx.fieldId('roomType')}
      label="Preferred room type"
      optional
      error={error}
    >
      {(a) => (
        <Controller
          control={ctx.control}
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
              disabled={ctx.busy}
            >
              <SelectTrigger
                id={a.id}
                aria-describedby={a['aria-describedby']}
                aria-invalid={a['aria-invalid']}
                onBlur={field.onBlur}
                className={inputClass(error)}
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
  );
}

'use client';

import Link from 'next/link';

import { countries } from '@/lib/checkout/countries';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import {
  arrivalOptions,
  MAX_REQUEST_LENGTH,
  type GuestInput,
} from '@/schemas/checkout.schema';

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
import { Field, inputClass } from './Field';

export type GuestField = keyof GuestInput;

interface DetailsStepProps {
  values: GuestInput;
  errors: Partial<Record<GuestField, string>>;
  disabled: boolean;
  onChange: (name: GuestField, value: string) => void;
  onBlur: (name: GuestField) => void;
  stay?: { adults: number; children: number };
  editHref?: string;
  website?: string;
  onWebsite?: (v: string) => void;
  /** 'edit' (manage page): email is read-only, and the stay block and honeypot are hidden. */
  mode?: 'checkout' | 'edit';
  /** Booking reference, used in the "Change email? Contact us" message. */
  reference?: string;
}

/** Step 1. Inline validation runs on blur; every field has the right autocomplete, type and inputmode. */
export function DetailsStep({
  values,
  errors,
  disabled,
  onChange,
  onBlur,
  stay,
  editHref,
  website = '',
  onWebsite,
  mode = 'checkout',
  reference,
}: DetailsStepProps) {
  const site = useSite();
  const edit = mode === 'edit';
  const bind = (name: GuestField) => ({
    name,
    value: values[name] ?? '',
    disabled,
    onChange: (e: { target: { value: string } }) =>
      onChange(name, e.target.value),
    onBlur: () => onBlur(name),
  });

  return (
    <section
      id="step-details"
      aria-labelledby="details-title"
      className="space-y-5"
    >
      <h2 id="details-title" className="font-display text-h3">
        Your details
      </h2>

      <Field id="field-fullName" label="Full name" error={errors.fullName}>
        {(a) => (
          <Input
            {...a}
            {...bind('fullName')}
            type="text"
            autoComplete="name"
            className={inputClass(errors.fullName)}
          />
        )}
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="field-email"
          label="Email"
          error={errors.email}
          hint={
            edit
              ? "Your email is how you find this booking, so it can't be changed here."
              : 'Your confirmation is sent here.'
          }
        >
          {(a) => (
            <Input
              {...a}
              {...bind('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={edit}
              aria-readonly={edit || undefined}
              className={`${inputClass(errors.email)} ${edit ? 'bg-paper' : ''}`}
            />
          )}
        </Field>
        <Field id="field-country" label="Country" error={errors.country}>
          {(a) => (
            <Select
              items={countries.map((c) => ({ value: c.code, label: c.name }))}
              value={values.country || 'NG'}
              onValueChange={(val) => {
                if (val) onChange('country', val);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={a.id}
                aria-describedby={a['aria-describedby']}
                className={inputClass(errors.country)}
              >
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      {edit && (
        <p className="text-small -mt-2">
          <a
            href={whatsappHref(
              site,
              `Hello, I need to change the email on booking ${reference ?? ''}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-brand inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
          >
            Change email? Contact us
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}

      <Field
        id="field-phone"
        label="Phone (WhatsApp)"
        error={errors.phone}
        hint="Use a number that works on WhatsApp. Add the country code if it is not from your selected country."
      >
        {(a) => (
          <Input
            {...a}
            {...bind('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            className={inputClass(errors.phone)}
          />
        )}
      </Field>

      <Field
        id="field-arrivalTime"
        label="Estimated arrival time"
        error={errors.arrivalTime}
      >
        {(a) => (
          <Select
            items={[
              { value: 'none', label: 'Choose a time' },
              ...arrivalOptions.map((o) => ({
                value: o.value,
                label: o.label,
              })),
            ]}
            value={values.arrivalTime || 'none'}
            onValueChange={(val) => {
              onChange('arrivalTime', val === 'none' || !val ? '' : val);
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={a.id}
              aria-describedby={a['aria-describedby']}
              className={inputClass(errors.arrivalTime)}
            >
              <SelectValue placeholder="Choose a time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose a time</SelectItem>
              {arrivalOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field
        id="field-specialRequests"
        label="Special requests"
        optional
        error={errors.specialRequests}
        hint={`${(values.specialRequests ?? '').length} / ${MAX_REQUEST_LENGTH} characters. We pass requests on but cannot always guarantee them.`}
      >
        {(a) => (
          <Textarea
            {...a}
            {...bind('specialRequests')}
            rows={4}
            maxLength={MAX_REQUEST_LENGTH + 50}
            autoComplete="off"
            className={`${inputClass(errors.specialRequests)} py-3`}
          />
        )}
      </Field>

      {!edit && (
        <>
          {/* Honeypot: hidden from people and assistive tech. Bots fill it; the server refuses those requests. */}
          <div
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          >
            <Label htmlFor="checkout-website-honeypot">Website</Label>
            <Input
              id="checkout-website-honeypot"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => onWebsite?.(e.target.value)}
            />
          </div>
        </>
      )}

      {!edit && stay && editHref && (
        <div className="rounded-control bg-paper text-small flex flex-wrap items-center justify-between gap-3 p-4">
          <p>
            <span className="font-semibold">
              {stay.adults} {stay.adults === 1 ? 'adult' : 'adults'}
            </span>
            {stay.children > 0 && (
              <span className="font-semibold">
                , {stay.children} {stay.children === 1 ? 'child' : 'children'}
              </span>
            )}
          </p>
          <Link
            href={editHref}
            className="decoration-brand inline-flex min-h-11 items-center font-semibold underline decoration-2 underline-offset-4"
          >
            Edit stay
          </Link>
        </div>
      )}
    </section>
  );
}

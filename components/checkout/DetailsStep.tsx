import Link from 'next/link'
import { whatsappHref } from '@/lib/site'
import { Field, inputClass } from './Field'
import { countries } from '@/lib/checkout/countries'
import { arrivalOptions, MAX_REQUEST_LENGTH, type GuestInput } from '@/schemas/checkout.schema'

export type GuestField = keyof GuestInput

interface DetailsStepProps {
  values: GuestInput
  errors: Partial<Record<GuestField, string>>
  disabled: boolean
  onChange: (name: GuestField, value: string) => void
  onBlur: (name: GuestField) => void
  stay?: { adults: number; children: number }
  editHref?: string
  website?: string
  onWebsite?: (v: string) => void
  /** 'edit' (manage page): email is read-only, and the stay block and honeypot are hidden. */
  mode?: 'checkout' | 'edit'
  /** Booking reference, used in the "Change email? Contact us" message. */
  reference?: string
}

/** Step 1. Inline validation runs on blur; every field has the right autocomplete, type and inputmode. */
export function DetailsStep({ values, errors, disabled, onChange, onBlur, stay, editHref, website = '', onWebsite, mode = 'checkout', reference }: DetailsStepProps) {
  const edit = mode === 'edit'
  const bind = (name: GuestField) => ({
    name,
    value: values[name] ?? '',
    disabled,
    onChange: (e: { target: { value: string } }) => onChange(name, e.target.value),
    onBlur: () => onBlur(name),
  })

  return (
    <section id="step-details" aria-labelledby="details-title" className="space-y-5">
      <h2 id="details-title" className="font-display text-h3">Your details</h2>

      <Field id="field-fullName" label="Full name" error={errors.fullName}>
        {(a) => <input {...a} {...bind('fullName')} type="text" autoComplete="name" className={inputClass(errors.fullName)} />}
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="field-email" label="Email" error={errors.email} hint={edit ? "Your email is how you find this booking, so it can't be changed here." : "Your confirmation is sent here."}>
          {(a) => <input {...a} {...bind('email')} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} readOnly={edit} aria-readonly={edit || undefined} className={`${inputClass(errors.email)} ${edit ? 'bg-paper' : ''}`} />}
        </Field>
        <Field id="field-country" label="Country" error={errors.country}>
          {(a) => (
            <select {...a} {...bind('country')} autoComplete="country" className={inputClass(errors.country)}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {edit && (
        <p className="-mt-2 text-small">
          <a href={whatsappHref(`Hello, I need to change the email on booking ${reference ?? ''}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4">
            Change email? Contact us<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}

      <Field id="field-phone" label="Phone (WhatsApp)" error={errors.phone} hint="Use a number that works on WhatsApp. Add the country code if it is not from your selected country.">
        {(a) => <input {...a} {...bind('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+234 801 234 5678" className={inputClass(errors.phone)} />}
      </Field>

      <Field id="field-arrivalTime" label="Estimated arrival time" error={errors.arrivalTime}>
        {(a) => (
          <select {...a} {...bind('arrivalTime')} className={inputClass(errors.arrivalTime)}>
            <option value="">Choose a time</option>
            {arrivalOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </Field>

      <Field id="field-specialRequests" label="Special requests" optional error={errors.specialRequests} hint={`${(values.specialRequests ?? '').length} / ${MAX_REQUEST_LENGTH} characters. We pass requests on but cannot always guarantee them.`}>
        {(a) => <textarea {...a} {...bind('specialRequests')} rows={4} maxLength={MAX_REQUEST_LENGTH + 50} autoComplete="off" className={`${inputClass(errors.specialRequests)} py-3`} />}
      </Field>

      {!edit && (
      <>
      {/* Honeypot: hidden from people and assistive tech. Bots fill it; the server refuses those requests. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => onWebsite?.(e.target.value)} />
        </label>
      </div>
      </>
      )}

      {!edit && stay && editHref && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-paper p-4 text-small">
        <p>
          <span className="font-semibold">{stay.adults} {stay.adults === 1 ? 'adult' : 'adults'}</span>
          {stay.children > 0 && <span className="font-semibold">, {stay.children} {stay.children === 1 ? 'child' : 'children'}</span>}
        </p>
        <Link href={editHref} className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4">
          Edit stay
        </Link>
      </div>
      )}
    </section>
  )
}

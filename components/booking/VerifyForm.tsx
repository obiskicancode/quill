'use client'

import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookingApi, BookingFailure } from '@/lib/booking/client'
import { verifyRequestSchema } from '@/lib/booking/schemas'
import type { GuestReservation } from '@/lib/booking/types'
import { formatCountdown } from '@/lib/checkout/format'
import { whatsappHref } from '@/lib/site'
import { Field, inputClass } from '../checkout/Field'
import { Banner } from '../checkout/CheckoutStates'
import { Button } from '../ui/Button'

export type VerifyVariant = 'verify' | 'missing' | 'notfound'

const copy: Record<VerifyVariant, { title: string; text: string }> = {
  verify: { title: 'Verify your booking', text: 'For your privacy, enter your booking reference and the email you booked with to see your booking.' },
  missing: { title: 'Find your booking', text: 'Enter the booking reference from your confirmation email and the email you booked with.' },
  notfound: { title: "We couldn't find that booking", text: 'Check the reference and the email you used, or message us and we will help. For your privacy we show the same message whether or not a booking exists.' },
}

interface VerifyFormProps {
  reference: string
  variant: VerifyVariant
  onVerified: (v: GuestReservation) => void
  /** 'manage' opens a 30-minute management session. */
  scope?: 'view' | 'manage'
  /** A short notice above the form, for example "Your session ended". */
  notice?: string
  /** Inside a dialog: no page container and a smaller heading. */
  embedded?: boolean
}

/** States: idle, loading, one generic error, and a lockout with a countdown after too many tries. */
export function VerifyForm({ reference, variant, onVerified, scope = 'view', notice, embedded = false }: VerifyFormProps) {
  const [ref, setRef] = useState(reference)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ reference?: string; email?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lockedFor, setLockedFor] = useState(0)

  useEffect(() => {
    if (lockedFor <= 0) return
    const id = window.setInterval(() => setLockedFor((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [lockedFor])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || lockedFor > 0) return
    const parsed = verifyRequestSchema.safeParse({ reference: ref, email, scope })
    if (!parsed.success) {
      const next: { reference?: string; email?: string } = {}
      for (const i of parsed.error.issues) next[i.path[0] as 'reference' | 'email'] ??= i.message
      setErrors(next)
      setServerError(null)
      return
    }
    setErrors({})
    setServerError(null)
    setBusy(true)
    try {
      onVerified(await bookingApi.verify(parsed.data))
    } catch (err) {
      if (err instanceof BookingFailure && err.status === 429) {
        setLockedFor(err.body?.retryAfterSeconds ?? 600)
        setServerError('Too many attempts. Please wait before trying again.')
      } else if (err instanceof BookingFailure && err.network) {
        setServerError("We couldn't reach the server. Check your connection and try again.")
      } else {
        // One generic message for every other failure.
        setServerError("We couldn't find a booking with those details. Check the reference and email and try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={embedded ? '' : 'container-page max-w-xl py-10 md:py-16'}>
      {notice && <div className="mb-6"><Banner tone="info" title={notice} /></div>}
      {embedded ? <h2 className="font-display text-h3">{copy[variant].title}</h2> : <h1 className="font-display text-h2">{copy[variant].title}</h1>}
      <p className="mt-3 text-body-lg text-ink/85">{copy[variant].text}</p>

      <form noValidate onSubmit={submit} className="mt-8 space-y-5">
        <Field id={`verify-reference${embedded ? '-embedded' : ''}`} label="Booking reference" error={errors.reference} hint="For example DEA-AB12CD">
          {(a) => <input {...a} value={ref} onChange={(e) => setRef(e.target.value)} type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={lockedFor > 0} className={`${inputClass(errors.reference)} uppercase`} />}
        </Field>
        <Field id={`verify-email${embedded ? '-embedded' : ''}`} label="Email used for the booking" error={errors.email}>
          {(a) => <input {...a} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} disabled={lockedFor > 0} className={inputClass(errors.email)} />}
        </Field>

        {serverError && (
          <Banner role="alert" tone="danger" title={lockedFor > 0 ? 'Please wait' : "We couldn't verify that booking"}>
            <p>{serverError}{lockedFor > 0 ? ` Try again in ${formatCountdown(lockedFor * 1000)}.` : ''}</p>
          </Banner>
        )}

        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={lockedFor > 0}>
          {lockedFor > 0 ? `Locked for ${formatCountdown(lockedFor * 1000)}` : 'Verify and view booking'}
        </Button>
      </form>

      <p className="mt-6 text-small">
        <a
          href={whatsappHref('Hello, I need help finding my booking.')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-accent decoration-2 underline-offset-4"
        >
          <MessageCircle className="size-4" aria-hidden />
          Message the hotel on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  )
}

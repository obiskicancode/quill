'use client'

import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookingApi, BookingFailure } from '@/lib/booking/client'
import { formatCountdown } from '@/lib/checkout/format'
import { whatsappHref } from '@/lib/site'
import { Button } from '../ui/Button'

type State = 'idle' | 'sending' | 'sent' | 'limited' | 'failed'

interface ResendEmailProps {
  reference: string
  maskedEmail: string
  /** Sentence start: "A confirmation was sent to" and similar. */
  lead: string
  demo: string | null
}

/** One-line email note with Resend email: idle, sending, sent (cooldown timer), rate-limited and failed. Result is announced politely. */
export function ResendEmail({ reference, maskedEmail, lead, demo }: ResendEmailProps) {
  const [state, setState] = useState<State>('idle')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  async function resend() {
    if (state === 'sending' || cooldown > 0) return
    setState('sending')
    try {
      const r = await bookingApi.resend(reference, demo)
      setCooldown(r.cooldownSeconds)
      setState('sent')
    } catch (e) {
      if (e instanceof BookingFailure && e.status === 429) {
        setCooldown(e.body?.retryAfterSeconds ?? 60)
        setState('limited')
      } else setState('failed')
    }
  }

  const message =
    state === 'sent' ? 'Email sent.'
    : state === 'limited' ? 'Please wait before asking for another email.'
    : state === 'failed' ? "We couldn't send the email. Please try again."
    : ''

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small">
      <p className="inline-flex items-center gap-2">
        <Mail className="size-4 text-accent-ink" aria-hidden />
        <span>{lead} <span className="font-semibold">{maskedEmail}</span></span>
      </p>
      <Button variant="secondary" size="sm" loading={state === 'sending'} disabled={cooldown > 0} onClick={resend}>
        {cooldown > 0 ? `Resend in ${formatCountdown(cooldown * 1000)}` : 'Resend email'}
      </Button>
      <a
        href={whatsappHref(`Hello, booking ${reference} was sent to the wrong email address.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4"
      >
        Wrong email? Contact us<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p role="status" aria-live="polite" className={`basis-full text-small font-medium ${state === 'failed' || state === 'limited' ? 'text-danger' : ''}`}>{message}</p>
    </div>
  )
}

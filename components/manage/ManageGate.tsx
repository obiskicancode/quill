'use client'

import { useState } from 'react'
import type { GuestReservation } from '@/lib/booking/types'
import { VerifyForm } from '../booking/VerifyForm'
import { ManageView } from './ManageView'

interface ManageGateProps {
  initial: GuestReservation | null
  /** Only pre-fills the reference field. It never unlocks the booking by itself. */
  reference: string
  demo: string | null
  /** A short notice, for example after a redirect. */
  notice?: string
}

/** Lookup form or the managed booking. Ending the session (sign out or timeout) returns to the lookup with a notice. */
export function ManageGate({ initial, reference, demo, notice }: ManageGateProps) {
  const [view, setView] = useState<GuestReservation | null>(initial)
  const [message, setMessage] = useState<string | undefined>(notice)
  return view ? (
    <ManageView
      initial={view}
      demo={demo}
      onSignedOut={() => { setMessage('You have signed out of this booking.'); setView(null) }}
      onExpired={() => { setMessage('Your session ended for your security. Please look up your booking again.'); setView(null) }}
    />
  ) : (
    <VerifyForm scope="manage" variant="missing" reference={reference} notice={message} onVerified={(next) => { setMessage(undefined); setView(next) }} />
  )
}

'use client'

import { useState } from 'react'
import type { GuestReservation } from '@/lib/booking/types'
import { ConfirmationView } from './ConfirmationView'
import { VerifyForm, type VerifyVariant } from './VerifyForm'

/** Shows the booking when the signed cookie already allowed it, otherwise the verify form (which swaps to the booking on success). */
export function ConfirmationGate({ initial, reference, variant, demo }: { initial: GuestReservation | null; reference: string; variant: VerifyVariant; demo: string | null }) {
  const [view, setView] = useState<GuestReservation | null>(initial)
  return view ? <ConfirmationView initial={view} demo={demo} /> : <VerifyForm reference={reference} variant={variant} onVerified={setView} />
}

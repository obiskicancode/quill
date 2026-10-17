'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { GuestReservation } from '@/lib/booking/types'
import { EASE_OUT } from '../motion/variants'
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
  const reduced = useReducedMotion()
  const transition = reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25, ease: EASE_OUT } }
  return (
    <AnimatePresence mode="wait" initial={false}>
      {view ? (
        <motion.div key="manage" {...transition}>
          <ManageView
            initial={view}
            demo={demo}
            onSignedOut={() => { setMessage('You have signed out of this booking.'); setView(null) }}
            onExpired={() => { setMessage('Your session ended for your security. Please look up your booking again.'); setView(null) }}
          />
        </motion.div>
      ) : (
        <motion.div key="verify" {...transition}>
          <VerifyForm scope="manage" variant="missing" reference={reference} notice={message} onVerified={(next) => { setMessage(undefined); setView(next) }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

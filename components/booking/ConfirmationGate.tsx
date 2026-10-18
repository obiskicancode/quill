'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { GuestReservation } from '@/types/booking.types'
import { EASE_OUT } from '../motion/variants'
import { ConfirmationView } from './ConfirmationView'
import { VerifyForm, type VerifyVariant } from './VerifyForm'

/** Shows the booking when the signed cookie already allowed it, otherwise the verify form (which swaps to the booking on success). */
export function ConfirmationGate({ initial, reference, variant, demo }: { initial: GuestReservation | null; reference: string; variant: VerifyVariant; demo: string | null }) {
  const [view, setView] = useState<GuestReservation | null>(initial)
  const reduced = useReducedMotion()
  const transition = reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25, ease: EASE_OUT } }
  return (
    <AnimatePresence mode="wait" initial={false}>
      {view ? (
        <motion.div key="booking" {...transition}>
          <ConfirmationView initial={view} demo={demo} />
        </motion.div>
      ) : (
        <motion.div key="verify" {...transition}>
          <VerifyForm reference={reference} variant={variant} onVerified={setView} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

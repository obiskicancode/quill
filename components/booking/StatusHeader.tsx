import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Clock, Hourglass, Landmark, MapPin, ShieldQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatMinor } from '@/lib/stay-types'
import type { GuestReservation, HeaderKind } from '@/lib/booking/types'
import { EASE_OUT } from '../motion/variants'
import { ButtonLink } from '../ui/Button'
import { ReferenceBlock } from './ReferenceBlock'

interface Copy {
  title: string
  text: ReactNode
  icon: ReactNode
}

function copyFor(kind: HeaderKind, v: GuestReservation, timedOut: boolean): Copy {
  const first = v.guest.fullName.split(' ')[0]
  const icon = (Icon: typeof Clock) => <Icon className="size-7" aria-hidden />
  if (v.status === 'checked_in') return { title: "You're checked in", text: 'We hope you enjoy your stay. Reception can help with anything you need.', icon: icon(CheckCircle2) }
  if (v.status === 'checked_out') return { title: 'Thank you for staying with us', text: 'Your stay is complete. We hope to welcome you again.', icon: icon(CheckCircle2) }
  if (v.status === 'no_show') return { title: 'This booking was marked as a no-show', text: 'The guest did not arrive, so the booking is closed. If this is a mistake, please contact the hotel.', icon: icon(AlertTriangle) }
  if (v.status === 'cancelled' && v.cancellation) {
    const c = v.cancellation
    const refund =
      c.refundStatus === 'initiated' ? `A refund of ${formatMinor(c.refundMinor)} has been started to your original payment method. Expect it in ${c.timeline}.`
      : c.refundStatus === 'pending_manual' ? `The hotel will refund ${formatMinor(c.refundMinor)} to your bank by transfer, usually in ${c.timeline}. They may contact you for your account details.`
      : 'No refund is due under the cancellation policy.'
    return { title: 'Your booking was cancelled', text: refund, icon: icon(AlertTriangle) }
  }
  switch (kind) {
    case 'confirmed':
      return { title: 'Your booking is confirmed', text: `Thank you, ${first}. Your room is reserved and we look forward to welcoming you.`, icon: icon(CheckCircle2) }
    case 'confirmed-deposit':
      return {
        title: 'Your booking is confirmed',
        text: <>Your deposit has been received. <strong className="font-semibold">Balance of {formatMinor(v.amounts.balanceMinor)} is due at the hotel.</strong></>,
        icon: icon(CheckCircle2),
      }
    case 'confirming':
      return timedOut
        ? { title: "We haven't heard back yet", text: 'Your payment may still be going through. You do not need to pay again. A confirmation email will follow as soon as it is confirmed. If it does not arrive, contact the hotel.', icon: icon(Clock) }
        : { title: "We're confirming your payment", text: 'Please keep this page open. It updates by itself as soon as your payment provider confirms.', icon: icon(Hourglass) }
    case 'transfer':
      return {
        title: 'Reservation received, awaiting payment verification',
        text: v.proofUploaded ? 'We have your transfer receipt. Your booking is confirmed once the hotel verifies the transfer.' : 'Make the transfer below and upload your receipt. Your booking is confirmed once the hotel verifies it.',
        icon: icon(Landmark),
      }
    case 'approval':
      return { title: 'Request received. The hotel will confirm shortly', text: `The hotel reviews every booking and usually replies ${v.approvalResponse}. We will email you the moment it is approved.`, icon: icon(ShieldQuestion) }
    case 'pay-at-hotel':
      return { title: 'Reserved. Pay at the hotel on arrival', text: <>Nothing to pay today. Please pay <strong className="font-semibold">{formatMinor(v.amounts.totalMinor)}</strong> when you arrive.</>, icon: icon(MapPin) }
    default:
      return v.status === 'expired'
        ? { title: 'Your hold on this room expired', text: 'The payment was not completed in time, so we released the room. Nothing was reserved.', icon: icon(AlertTriangle) }
        : v.status === 'cancelled'
          ? { title: 'This booking was cancelled', text: 'The payment was cancelled, so this booking is not active. Nothing was reserved.', icon: icon(AlertTriangle) }
          : { title: "The payment didn't go through", text: 'The payment was not completed, so this booking is not active. Nothing was reserved.', icon: icon(AlertTriangle) }
  }
}

/** The top block. Only a confirmed booking gets the dark, success treatment. Every other state is plain. */
export function StatusHeader({ v, kind, timedOut, children }: { v: GuestReservation; kind: HeaderKind; timedOut: boolean; children?: ReactNode }) {
  const { title, text, icon } = copyFor(kind, v, timedOut)
  const reduced = useReducedMotion()
  const success = kind === 'confirmed' || kind === 'confirmed-deposit'
  const bookAgain = v.stay.checkIn && v.stay.checkOut
    ? `/checkout?${new URLSearchParams({ room: v.room.slug, checkIn: v.stay.checkIn, checkOut: v.stay.checkOut, adults: String(v.stay.adults), children: String(v.stay.children) }).toString()}`
    : `/rooms/${v.room.slug}`

  return (
    <section
      aria-labelledby="status-title"
      className={`rounded-card p-6 md:p-8 ${success ? 'on-dark bg-ink text-paper' : 'border border-line bg-surface text-ink shadow-raised'}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          className="flex items-start gap-4"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: EASE_OUT }}
        >
          <span className={`grid size-14 shrink-0 place-items-center rounded-full ${success ? 'bg-accent text-ink' : 'bg-ink/10 text-ink'}`}>{icon}</span>
          <div className="min-w-0">
            <h1 id="status-title" className="font-display text-h2 text-balance">{title}</h1>
            <p className={`mt-2 max-w-2xl text-body-lg ${success ? 'text-paper/90' : 'text-ink/85'}`}>{text}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-6">
        <ReferenceBlock reference={v.reference} large={success} />
      </div>
      {children && <div className="mt-6">{children}</div>}
      {kind === 'ended' && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={bookAgain} size="lg">Book again</ButtonLink>
          <ButtonLink href={`tel:${v.hotel.phoneTel}`} variant="secondary" size="lg">Call the hotel</ButtonLink>
          <ButtonLink href={`https://wa.me/${v.hotel.whatsappNumber}?text=${encodeURIComponent(`Hello, I need help with booking ${v.reference}.`)}`} external variant="secondary" size="lg">WhatsApp the hotel</ButtonLink>
        </div>
      )}
    </section>
  )
}

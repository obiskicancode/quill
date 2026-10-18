'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, ChevronDown, Clock, Lock, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EASE_OUT } from '../motion/variants'
import { formatDeadline, formatCountdown } from '@/lib/checkout/format'
import type { CheckoutQuoteResponse, ConfirmationMode } from '@/types/checkout.types'
import { formatRange } from '@/lib/room-query'
import { whatsappHref } from '@/lib/site'
import { formatMinor } from '@/types/stay.types'
import { BreakdownSkeleton, PriceBreakdown } from '../room-detail/PriceBreakdown'
import { Photo } from '../ui/Photo'

export type OkQuote = Extract<CheckoutQuoteResponse, { status: 'ok' }>

export interface SummaryRoom {
  name: string
  bedConfig: string
  image: { src: string; alt: string } | null
}

export interface HoldView {
  remainingMs: number | null
  expiring: boolean
  expired: boolean
}

interface SummaryProps {
  room: SummaryRoom
  stay: { checkIn: string; checkOut: string; adults: number; children: number }
  /** null while the quote is loading. */
  quote: OkQuote | null
  hotelTimes: { checkIn: string; checkOut: string }
  /** null until the reservation (and so the hold) exists. */
  hold: HoldView | null
  holdSeconds: number
  confirmationMode: ConfirmationMode
}


/** Room photo and name, dates, guests and check-in/out times. Shared by checkout and the confirmation page. */
export function StayFacts({
  room, stay, nights, hotelTimes,
}: {
  room: SummaryRoom
  stay: { checkIn: string | null; checkOut: string | null; adults: number; children: number }
  nights?: number
  hotelTimes: { checkIn: string; checkOut: string }
}) {
  const row = 'flex justify-between gap-4'
  return (
    <>
      <div className="flex gap-4">
        {room.image ? (
          <Photo src={room.image.src} alt={room.image.alt} sizes="96px" className="size-20 shrink-0 rounded-control" />
        ) : (
          <div aria-hidden className="size-20 shrink-0 rounded-control bg-ink/10" />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-h3 line-clamp-2">{room.name}</h2>
          <p className="mt-1 text-small text-muted">{room.bedConfig}</p>
        </div>
      </div>

      <dl className="space-y-1.5 text-small">
        <div className={row}>
          <dt className="text-muted">Dates</dt>
          <dd className="font-semibold">
            {stay.checkIn && stay.checkOut ? formatRange(stay.checkIn, stay.checkOut) : 'To be confirmed'}
            {nights ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}
          </dd>
        </div>
        <div className={row}><dt className="text-muted">Guests</dt><dd className="font-semibold">{stay.adults} {stay.adults === 1 ? 'adult' : 'adults'}{stay.children > 0 ? `, ${stay.children} ${stay.children === 1 ? 'child' : 'children'}` : ''}</dd></div>
        <div className={row}><dt className="text-muted">Check-in</dt><dd>From {hotelTimes.checkIn}</dd></div>
        <div className={row}><dt className="text-muted">Check-out</dt><dd>By {hotelTimes.checkOut}</dd></div>
      </dl>
    </>
  )
}

/** The stay, the server's price breakdown, the cancellation deadline, the hold and the trust lines. */
export function SummaryCard({ room, stay, quote, hotelTimes, hold, holdSeconds, confirmationMode }: SummaryProps) {
  const guests = stay.adults + stay.children
  const nights = quote?.breakdown.nights

  return (
    <section aria-label="Your stay" className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-float">
      <StayFacts room={room} stay={stay} nights={nights} hotelTimes={hotelTimes} />

      <div className="border-t border-line pt-5" aria-busy={!quote}>
        {quote ? <PriceBreakdown quote={{ ...quote.breakdown }} /> : <BreakdownSkeleton />}
        {quote && guests > 0 && <p className="sr-only">For {guests} guests</p>}
      </div>

      {quote && (
        <div className="rounded-control bg-paper p-4 text-small">
          <p className="font-semibold">
            {quote.policy.nonRefundable
              ? 'Non-refundable'
              : quote.policy.freeCancellationUntil
                ? `Free cancellation until ${formatDeadline(quote.policy.freeCancellationUntil)}`
                : quote.policy.note}
          </p>
          {quote.policy.freeCancellationUntil && <p className="mt-1 text-muted">After that, cancellation charges apply. See the Cancellation Policy.</p>}
        </div>
      )}

      <div
        className={`flex items-center gap-3 rounded-control border p-4 text-small ${
          hold?.expired ? 'border-danger bg-danger/5' : hold?.expiring ? 'border-danger bg-danger/5' : 'border-line'
        }`}
      >
        <Clock className={`size-5 shrink-0 ${hold?.expiring || hold?.expired ? 'text-danger' : 'text-accent-ink'}`} aria-hidden />
        {!hold ? (
          <p>We will hold this room for you for {Math.round(holdSeconds / 60)} minutes once you continue.</p>
        ) : hold.expired ? (
          <p className="font-semibold text-danger">Your hold has expired.</p>
        ) : (
          <p className={hold.expiring ? 'font-semibold text-danger' : ''}>
            We&rsquo;re holding this room for you: <span className="font-display text-body-lg tabular-nums" aria-hidden>{formatCountdown(hold.remainingMs ?? 0)}</span>
            <span className="sr-only">{Math.ceil((hold.remainingMs ?? 0) / 60000)} minutes left</span>
          </p>
        )}
      </div>

      <ul className="space-y-1.5 text-small">
        <li className="flex items-center gap-2"><Lock className="size-4 shrink-0 text-accent-ink" aria-hidden />Secure payment</li>
        <li className="flex items-center gap-2">
          {confirmationMode === 'instant'
            ? <><BadgeCheck className="size-4 shrink-0 text-accent-ink" aria-hidden />Instant confirmation</>
            : <><ShieldCheck className="size-4 shrink-0 text-accent-ink" aria-hidden />Confirmed after hotel approval</>}
        </li>
        <li>
          <a
            href={whatsappHref(`Hello, I need help with my booking for the ${room.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-accent decoration-2 underline-offset-4"
          >
            <MessageCircle className="size-4" aria-hidden />
            Need help? Chat on WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </section>
  )
}

/** Mobile: a collapsed "₦X total, View details" row that opens the full summary in a bottom sheet. */
export function MobileSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      setVisible(true)
      return
    }
    setVisible(false)
    if (reduced && dialog.open) dialog.close()
  }, [open, reduced])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-card border border-line bg-surface px-5 text-left shadow-raised"
      >
        <span className="min-w-0">
          {props.quote ? (
            <span className="font-semibold">{formatMinor(props.quote.breakdown.totalMinor)} total</span>
          ) : (
            <span aria-hidden className="block h-5 w-28 rounded bg-ink/10 motion-safe:animate-pulse" />
          )}
          <span className="block truncate text-small text-muted">{props.room.name}, {formatRange(props.stay.checkIn, props.stay.checkOut)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold underline decoration-accent decoration-2 underline-offset-4">
          View details <ChevronDown className="size-4" aria-hidden />
        </span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="mobile-summary-title"
        onClose={() => setOpen(false)}
        className="inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none rounded-t-card bg-paper p-0 text-ink backdrop:bg-ink/60 open:flex open:flex-col"
      >
        <AnimatePresence
          onExitComplete={() => {
            const dialog = ref.current
            if (dialog?.open) dialog.close()
          }}
        >
          {visible && (
            <motion.div
              key="mobile-summary"
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: 16 }}
              transition={{ duration: reduced ? 0 : 0.26, ease: EASE_OUT }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-2">
                <h2 id="mobile-summary-title" className="font-display text-h3">Your booking</h2>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-ink/10">
                  <X className="size-6" aria-hidden />
                </button>
              </div>
              <div className="overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <SummaryCard {...props} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </div>
  )
}

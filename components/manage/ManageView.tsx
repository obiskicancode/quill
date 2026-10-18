'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { headerKind, type GuestReservation } from '@/types/booking.types'
import { manageApi, ManageFailure } from '@/lib/manage/client'
import { formatCountdown } from '@/lib/checkout/format'
import { EASE_OUT } from '../motion/variants'
import { ActionRow } from '../booking/ActionRow'
import { AddExtrasStrip } from '../booking/AddExtrasStrip'
import { PaymentSummary } from '../booking/PaymentSummary'
import { PolicySection } from '../booking/PolicySection'
import { PrintVoucher } from '../booking/PrintVoucher'
import { ResendEmail } from '../booking/ResendEmail'
import { StatusHeader } from '../booking/StatusHeader'
import { StayDetailsCard } from '../booking/StayDetailsCard'
import { TransferPanel } from '../booking/TransferPanel'
import { Banner } from '../checkout/CheckoutStates'
import { useHoldCountdown } from '../checkout/useHoldCountdown'
import { HelpBlock } from '../HelpBlock'
import { Button, ButtonLink } from '../ui/Button'
import { ActionsPanel } from './ActionsPanel'
import { ActivityTimeline } from './ActivityTimeline'
import { CancelFlow } from './CancelFlow'
import { ChangeDatesFlow } from './ChangeDatesFlow'
import { ChangePayment } from './ChangePayment'
import { EditDetailsPanel } from './EditDetailsPanel'
import { SessionBar } from './SessionBar'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 90_000

const emailLead = {
  confirmed: 'A confirmation was sent to',
  'confirmed-deposit': 'A confirmation was sent to',
  confirming: 'We will email your confirmation to',
  transfer: 'We emailed your booking details to',
  approval: 'We emailed your booking details to',
  'pay-at-hotel': 'We emailed your booking details to',
  ended: '',
} as const

interface ManageViewProps {
  initial: GuestReservation
  demo: string | null
  onSignedOut: () => void
  onExpired: () => void
}

/**
 * The manage page for a verified guest. Everything the guest may do comes from the server's "allowed actions";
 * the page never works out policies, refunds or prices itself.
 */
export function ManageView({ initial, demo, onSignedOut, onExpired }: ManageViewProps) {
  const [v, setV] = useState(initial)
  const [announcement, setAnnouncement] = useState('')
  const [expired, setExpired] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()
  const presence = reduced ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: EASE_OUT } }

  const m = v.manage
  const csrf = m?.csrfToken ?? ''
  const kind = headerKind(v)
  const pending = m?.pendingChange ?? null
  const hold = useHoldCountdown(v.status === 'pending_payment' ? Date.parse(v.holdExpiresAt ?? '') || null : null, 0)

  const applyView = useCallback((next: GuestReservation, message?: string) => {
    if (!next.manage) return setExpired(true)
    setV(next)
    if (message) setAnnouncement(message)
  }, [])

  /** A read-only reload. Retrying it can never change the booking. */
  const refresh = useCallback(async () => {
    setRefreshing(true)
    setRefreshError(false)
    try {
      applyView(await manageApi.get(v.reference, demo))
    } catch (e) {
      if (e instanceof ManageFailure && e.sessionExpired) setExpired(true)
      else setRefreshError(true)
    } finally {
      setRefreshing(false)
    }
  }, [v.reference, demo, applyView])

  // Session countdown: when the 30 minutes are up, ask the guest to verify again.
  useEffect(() => {
    if (!m) return
    const id = window.setInterval(() => {
      if (Date.parse(m.sessionExpiresAt) <= Date.now()) setExpired(true)
    }, 10_000)
    return () => window.clearInterval(id)
  }, [m])

  const flowOpen = cancelOpen || changeOpen || editOpen
  useEffect(() => {
    if (expired && !flowOpen) onExpired()
  }, [expired, flowOpen, onExpired])

  // Poll while a payment is being confirmed (the booking's, or the extra payment for new dates).
  const waiting = kind === 'confirming' || pending?.status === 'awaiting_payment'
  useEffect(() => {
    if (!waiting) return
    let stopped = false
    let timer: number | undefined
    const started = Date.now()
    const tick = async () => {
      try {
        const next = await manageApi.get(v.reference, demo)
        if (stopped) return
        if (!next.manage) return setExpired(true)
        const changed = next.status !== v.status || next.manage.pendingChange?.status !== pending?.status || Boolean(next.manage.pendingChange) !== Boolean(pending)
        setV(next)
        if (changed) return setAnnouncement('Your booking has been updated.')
      } catch {
        /* keep polling until the timeout */
      }
      if (!stopped && Date.now() - started < POLL_TIMEOUT_MS) timer = window.setTimeout(tick, POLL_INTERVAL_MS)
    }
    timer = window.setTimeout(tick, POLL_INTERVAL_MS)
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, v.status, pending?.status])

  async function signOut() {
    setSigningOut(true)
    try {
      await manageApi.signOut(v.reference, csrf, demo)
    } catch {
      /* the session ends on the server either way */
    }
    onSignedOut()
  }

  const flowProps = {
    v, csrf, demo, sessionExpired: expired, onSessionExpired: () => setExpired(true),
    onReverified: () => { setExpired(false); void refresh() },
  }
  const closeFlow = (set: (b: boolean) => void) => () => {
    set(false)
    trigger.current?.focus()
  }
  const open = (set: (b: boolean) => void) => (el: HTMLElement) => {
    trigger.current = el
    set(true)
  }

  if (!m) return null
  return (
    <div className="confirmation-page">
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>

      <div className="container-page max-w-5xl space-y-8 py-8 md:py-12 print:hidden">
        <SessionBar expiresAt={m.sessionExpiresAt} onSignOut={() => void signOut()} busy={signingOut} />

        <StatusHeader v={v} kind={kind} timedOut={false}>
          {kind === 'transfer' && <TransferPanel v={v} onUploaded={() => void refresh()} />}
          {v.status === 'pending_payment' && hold.remainingMs !== null && (
            <p className={`rounded-control p-3 text-small ${hold.expiring ? 'bg-danger/5 font-semibold text-danger' : 'bg-paper text-ink'}`}>
              {hold.expired ? 'The hold on your room has ended.' : <>Your room is held for you: <span className="font-semibold tabular-nums">{formatCountdown(hold.remainingMs)}</span></>}
            </p>
          )}
        </StatusHeader>

        <AnimatePresence initial={false}>
          {refreshError && (
            <motion.div {...presence}>
              <Banner role="alert" tone="danger" title="We couldn't refresh your booking" actions={<Button variant="secondary" size="sm" loading={refreshing} onClick={() => void refresh()}>Try again</Button>}>
                <p>Your booking is safe. This only reloads what you see, so trying again changes nothing.</p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {pending && !changeOpen && (
            <motion.section {...presence} aria-labelledby="pending-title" className="space-y-3 rounded-card border-2 border-ink bg-surface p-5 md:p-6">
              <h2 id="pending-title" className="font-display text-h3">A date change is waiting for payment</h2>
              <ChangePayment reference={v.reference} change={pending} csrf={csrf} demo={demo} onRefresh={refresh} onSessionExpired={() => setExpired(true)} />
            </motion.section>
          )}
        </AnimatePresence>

        <ActionsPanel v={v} onCancel={open(setCancelOpen)} onChangeDates={open(setChangeOpen)} onEdit={open(setEditOpen)} />

        <AnimatePresence initial={false}>
          {editOpen && (
            <motion.div {...presence}>
              <EditDetailsPanel
                v={v} csrf={csrf} demo={demo} sessionExpired={expired} onSessionExpired={() => setExpired(true)}
                onReverified={() => { setExpired(false); void refresh() }}
                onSaved={(next) => applyView(next, 'Your details have been saved.')}
                onClose={() => { setEditOpen(false); trigger.current?.focus() }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ActionRow v={v} demo={demo} hideManage />
        {kind !== 'ended' && <ResendEmail reference={v.reference} maskedEmail={v.guest.email} lead={emailLead[kind]} demo={demo} />}

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <StayDetailsCard v={v} contact={m.contact} />
          <PaymentSummary v={v} />
        </div>

        <ActivityTimeline entries={m.timeline} />
        <PolicySection v={v} refundNow={m.cancellation} />
        <AddExtrasStrip v={v} mode="whatsapp" />
      </div>

      <div className="print:hidden">
        <HelpBlock
          title="Need to change something?"
          text="If it can't be done online, message us or call and we will sort it. Your booking reference is already filled in."
          message={`Hello ${v.hotel.name}, I need help with booking ${v.reference}.`}
        >
          <ButtonLink href={`/contact?topic=booking&ref=${encodeURIComponent(v.reference)}`} variant="secondary" icon={<MessageSquare className="size-5" aria-hidden />}>
            Message the hotel about this booking
          </ButtonLink>
        </HelpBlock>
        <div className="h-16" aria-hidden />
      </div>

      <CancelFlow
        {...flowProps}
        open={cancelOpen}
        onClose={closeFlow(setCancelOpen)}
        onUpdated={applyView}
      />
      <ChangeDatesFlow
        {...flowProps}
        open={changeOpen}
        onClose={closeFlow(setChangeOpen)}
        onUpdated={applyView}
        onRefresh={refresh}
      />

      <PrintVoucher v={v} />
    </div>
  )
}

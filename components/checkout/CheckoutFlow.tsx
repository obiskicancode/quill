'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiFailure, loadProviderScript, newKey } from '@/lib/checkout/client'
import {
  checkProofFile, guestSchema, type GuestInput, type ReservationRequestInput,
} from '@/schemas/checkout.schema'
import type { BankDetails, CheckoutQuoteResponse, PaymentMethod } from '@/types/checkout.types'
import { formatMinor } from '@/types/stay.types'
import { EASE_OUT } from '../motion/variants'
import { Button } from '../ui/Button'
import { DetailsStep, type GuestField } from './DetailsStep'
import { ExtrasStep } from './ExtrasStep'
import { PaymentStep } from './PaymentStep'
import { ProgressSteps, type StepInfo } from './ProgressSteps'
import {
  Banner, ConfirmingScreen, ErrorSummary, ExpiredPanel, ExpiringBanner, FailedPanel, NetworkErrorBanner,
  PriceUpdatedPanel, RequestReceivedScreen, TransferSubmittedScreen, UnavailableState,
} from './CheckoutStates'
import { MobileSummary, SummaryCard, type OkQuote, type SummaryRoom } from './SummaryCard'
import { useHoldCountdown } from './useHoldCountdown'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30_000
const FIELD_ORDER: GuestField[] = ['fullName', 'email', 'country', 'phone', 'arrivalTime', 'specialRequests']
const FIELD_LABELS: Record<GuestField, string> = {
  fullName: 'Full name', email: 'Email', country: 'Country', phone: 'Phone', arrivalTime: 'Arrival time', specialRequests: 'Special requests',
}
const TERMS_MESSAGE = 'Please accept the Terms, Privacy Policy and Cancellation Policy to continue.'

type Phase =
  | { name: 'form' }
  | { name: 'redirecting' }
  | { name: 'confirming' }
  | { name: 'failed'; reason: 'failed' | 'cancelled' }
  | { name: 'transfer-submitted' }
  | { name: 'request-received'; reason: 'pay_at_hotel' | 'manual' }

interface ReservationState {
  reference: string
  holdExpiresAt: number
  skewMs: number
}

interface CheckoutFlowProps {
  room: SummaryRoom & { slug: string }
  stay: { checkIn: string; checkOut: string; adults: number; children: number }
  initialQuote: CheckoutQuoteResponse
  demo: string | null
  seenTotalMinor: number | null
  resumeReference: string | null
  hotelTimes: { checkIn: string; checkOut: string }
}

export function CheckoutFlow({ room, stay, initialQuote, demo, seenTotalMinor, resumeReference, hotelTimes }: CheckoutFlowProps) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const bannerMotion = reduced ? {} : { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }
  const bannerTransition = { duration: reduced ? 0 : 0.2, ease: EASE_OUT }

  // --- quote (always from the server) ---
  const [quote, setQuote] = useState<CheckoutQuoteResponse>(initialQuote)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteFailed, setQuoteFailed] = useState(false)
  // A guest returning from the payment provider has already accepted the price.
  const resumed = resumeReference !== null
  const [accepted, setAccepted] = useState(resumed)
  const ok: OkQuote | null = quote.status === 'ok' ? quote : null
  const priceChange = ok?.priceChange && !accepted ? ok.priceChange : null

  // --- form ---
  const [values, setValues] = useState<GuestInput>({ fullName: '', email: '', country: 'NG', phone: '', arrivalTime: '', specialRequests: '' })
  const [errors, setErrors] = useState<Partial<Record<GuestField, string>>>({})
  const [terms, setTerms] = useState(resumed)
  const [termsError, setTermsError] = useState<string | undefined>()
  const [website, setWebsite] = useState('')
  const [extraBed, setExtraBed] = useState(ok?.extraBed.selected ?? false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [method, setMethod] = useState<PaymentMethod>(ok?.payment.acceptedMethods[0] ?? 'online')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  // --- reservation and payment ---
  const [phase, setPhase] = useState<Phase>(resumeReference ? { name: 'confirming' } : { name: 'form' })
  const [reservation, setReservation] = useState<ReservationState | null>(resumeReference ? { reference: resumeReference, holdExpiresAt: 0, skewMs: 0 } : null)
  const [bank, setBank] = useState<{ details: BankDetails; amountMinor: number; reference: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [netError, setNetError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [pollNonce, setPollNonce] = useState(0)
  const [focusTick, setFocusTick] = useState(0)

  const submitting = useRef(false)
  const reserveKey = useRef(newKey()) // generated when the page loads
  const payKey = useRef<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const inForm = phase.name === 'form' || phase.name === 'failed'
  const holdActive = reservation !== null && reservation.holdExpiresAt > 0 && inForm
  const hold = useHoldCountdown(holdActive ? reservation.holdExpiresAt : null, reservation?.skewMs ?? 0)
  const expired = holdActive && hold.expired
  const locked = reservation !== null

  const guests = stay.adults + stay.children
  const catalog = ok?.extrasCatalog ?? []
  const showExtras = catalog.length > 0 || Boolean(ok?.extraBed.needed && ok.extraBed.available)
  const selections = Object.entries(quantities).filter(([, q]) => q > 0).map(([id, quantity]) => ({ id, quantity }))
  const lineTotals = Object.fromEntries((ok?.breakdown.extras ?? []).map((l) => [l.id, l.totalMinor]))

  const checkoutHref = useCallback(
    (range: { checkIn: string; checkOut: string }) => {
      const p = new URLSearchParams({ room: room.slug, checkIn: range.checkIn, checkOut: range.checkOut, adults: String(stay.adults), children: String(stay.children) })
      const keep = (demo ?? '').split(',').filter((d) => d && d !== 'unavailable' && d !== 'changed')
      if (keep.length) p.set('demo', keep.join(','))
      return `/checkout?${p.toString()}`
    },
    [room.slug, stay.adults, stay.children, demo],
  )
  const staySearch = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, adults: String(stay.adults), children: String(stay.children) }).toString()
  const confirmationHref = (ref: string) => `/booking/confirmation?ref=${encodeURIComponent(ref)}`

  const quoteRequest = useCallback(
    () => ({ room: room.slug, ...stay, extraBed, extras: selections, seenTotalMinor: null, demo }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.slug, stay, extraBed, quantities, demo],
  )

  // --- live re-quote when extras or the extra bed change ---
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (reservation || quote.status !== 'ok') return
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true)
      setQuoteFailed(false)
      setAccepted(true)
      try {
        setQuote(await api.quote(quoteRequest()))
      } catch {
        setQuoteFailed(true)
      } finally {
        setQuoteLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraBed, quantities])

  // --- focus the error summary after a failed submit ---
  useEffect(() => {
    if (focusTick > 0) summaryRef.current?.focus()
  }, [focusTick])

  // --- polling after the guest returns from the provider (only the verified webhook changes the status) ---
  useEffect(() => {
    if (phase.name !== 'confirming' || !reservation) return
    const reference = reservation.reference
    let stopped = false
    let timer: number | undefined
    const started = Date.now()

    const tick = async () => {
      try {
        const s = await api.status(reference)
        if (stopped) return
        setReservation({ reference, holdExpiresAt: Date.parse(s.holdExpiresAt), skewMs: Date.parse(s.serverTime) - Date.now() })
        if (s.status === 'confirmed') return router.push(confirmationHref(reference))
        if (s.status === 'pending_approval') return setPhase({ name: 'request-received', reason: 'manual' })
        if (s.status === 'payment_failed' || s.paymentStatus === 'failed') return setPhase({ name: 'failed', reason: 'failed' })
        if (s.status === 'cancelled' || s.paymentStatus === 'cancelled') return setPhase({ name: 'failed', reason: 'cancelled' })
      } catch {
        /* keep polling until the timeout */
      }
      if (stopped) return
      if (Date.now() - started > POLL_TIMEOUT_MS) return setTimedOut(true)
      timer = window.setTimeout(tick, POLL_INTERVAL_MS)
    }
    void tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name, pollNonce, reservation?.reference])

  // --- validation ---
  const issuesFor = (v: GuestInput) => {
    const out: Partial<Record<GuestField, string>> = {}
    const r = guestSchema.safeParse(v)
    if (!r.success) for (const i of r.error.issues) out[i.path[0] as GuestField] ??= i.message
    return out
  }
  const detailsValid = resumed || guestSchema.safeParse(values).success

  const onChange = (name: GuestField, value: string) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name] || (name === 'country' && errors.phone)) setErrors((e) => ({ ...e, [name]: undefined, ...(name === 'country' ? { phone: undefined } : {}) }))
  }
  const onBlur = (name: GuestField) => {
    if (name === 'specialRequests' && !values.specialRequests) return
    setErrors((e) => ({ ...e, [name]: issuesFor(values)[name] }))
  }

  const summaryItems = [
    ...FIELD_ORDER.filter((n) => errors[n]).map((n) => ({ id: `field-${n}`, message: `${FIELD_LABELS[n]}: ${errors[n]}` })),
    ...(termsError ? [{ id: 'field-terms', message: termsError }] : []),
    ...(proofError ? [{ id: 'field-proof', message: proofError }] : []),
  ]

  // --- actions ---
  function handleFailure(err: unknown) {
    const fail = err instanceof ApiFailure ? err : null
    const body = fail?.body
    if (!fail || fail.network || fail.status >= 500) {
      setNetError("We couldn't reach the server, so we don't know if that went through.")
      return
    }
    payKey.current = null
    if (body?.code === 'validation' && body.fieldErrors) {
      const next: Partial<Record<GuestField, string>> = {}
      let termsMsg: string | undefined
      for (const [key, message] of Object.entries(body.fieldErrors)) {
        if (key.startsWith('guest.')) next[key.slice(6) as GuestField] = message
        if (key === 'termsAccepted') termsMsg = message
      }
      setErrors(next)
      setTermsError(termsMsg)
      setFocusTick((t) => t + 1)
    } else if (body?.code === 'unavailable' && body.quote) {
      setQuote(body.quote)
    } else if (body?.code === 'price_changed' && body.quote) {
      setQuote(body.quote)
      setAccepted(false)
    } else if (body?.code === 'hold_expired') {
      setReservation((r) => (r ? { ...r, holdExpiresAt: Date.now() - 1 } : r))
    } else {
      setNetError(body?.message ?? 'Something went wrong. Please try again.')
    }
  }

  async function startPayment(reference: string) {
    const key = (payKey.current ??= newKey())
    const init = await api.initPayment({ reference, method, idempotencyKey: key, demo })
    if (init.kind === 'redirect') {
      setPhase({ name: 'redirecting' })
      window.location.assign(init.url) // the provider's hosted checkout. Confirmation comes only from its webhook.
      return
    }
    payKey.current = null
    setBank({ details: init.bank, amountMinor: init.amountMinor, reference: init.reference })
    setPhase({ name: 'form' })
  }

  async function submitProof(reference: string) {
    if (!proofFile) {
      setProofError('Choose your transfer receipt to upload.')
      document.getElementById('field-proof')?.focus()
      return
    }
    const problem = checkProofFile(proofFile)
    if (problem) {
      setProofError(problem)
      document.getElementById('field-proof')?.focus()
      return
    }
    setProofError(null)
    await api.uploadProof(reference, proofFile)
    setPhase({ name: 'transfer-submitted' })
  }

  async function submit() {
    if (submitting.current || !ok || quoteLoading || priceChange || expired) return
    let current = reservation

    // Once the reservation exists its details and terms are already saved, so only a new reservation is validated.
    if (!current) {
      const fieldIssues = issuesFor(values)
      const tErr = terms ? undefined : TERMS_MESSAGE
      setErrors(fieldIssues)
      setTermsError(tErr)
      if (Object.keys(fieldIssues).length > 0 || tErr) {
        setFocusTick((t) => t + 1)
        return
      }
    }

    submitting.current = true
    setBusy(true)
    setNetError(null)
    try {
      if (!current) {
        const body: ReservationRequestInput = {
          idempotencyKey: reserveKey.current,
          room: room.slug,
          ...stay,
          extraBed,
          extras: selections,
          guest: values,
          expectedTotalMinor: ok.breakdown.totalMinor,
          termsAccepted: true,
          website,
          demo,
        }
        const res = await api.createReservation(body)
        current = { reference: res.reference, holdExpiresAt: Date.parse(res.holdExpiresAt), skewMs: Date.parse(res.serverTime) - Date.now() }
        setReservation(current)
      }
      if (ok.payment.mode === 'pay_at_hotel') {
        setPhase({ name: 'request-received', reason: ok.confirmationMode === 'manual' ? 'manual' : 'pay_at_hotel' })
      } else if (method === 'bank_transfer' && bank) {
        await submitProof(current.reference)
      } else {
        await startPayment(current.reference)
      }
    } catch (err) {
      handleFailure(err)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function restart() {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      reserveKey.current = newKey()
      payKey.current = null
      setReservation(null)
      setBank(null)
      setProofFile(null)
      setNetError(null)
      setTimedOut(false)
      setPhase({ name: 'form' })
      router.replace(checkoutHref(stay))
      setAccepted(true)
      setQuote(await api.quote({ ...quoteRequest(), demo: (demo ?? '').split(',').filter((d) => d !== 'unavailable').join(',') || null }))
    } catch {
      setNetError("We couldn't re-check availability. Please try again.")
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const retryPayment = () => {
    payKey.current = null
    setPhase({ name: 'form' })
    window.setTimeout(() => void submit(), 0)
  }

  const switchMethod = () => {
    payKey.current = null
    setBank(null)
    setPhase({ name: 'form' })
    document.getElementById('step-payment')?.scrollIntoView({ block: 'start' })
  }

  function chooseMethod(next: PaymentMethod) {
    setMethod(next)
    if (next !== 'bank_transfer') setBank(null)
    payKey.current = null
    if (next === 'online' && ok) loadProviderScript(ok.payment.provider)
  }

  // --- full-width states ---
  if (quote.status === 'unavailable') {
    return (
      <div className="container-page py-8 md:py-12">
        <UnavailableState room={room} stay={stay} suggestions={quote.suggestions} hrefFor={checkoutHref} similarHref={`/rooms?${staySearch}`} />
      </div>
    )
  }
  if (!ok) {
    return (
      <div className="container-page py-8 md:py-12">
        <Banner role="alert" tone="danger" title="We couldn't open checkout">
          <p>{quote.status === 'invalid' ? quote.message : ''}</p>
        </Banner>
      </div>
    )
  }

  const payment = ok.payment
  const redirecting = phase.name === 'redirecting'
  const disabledAction = busy || redirecting || quoteLoading || expired || Boolean(priceChange)
  const label = busy
    ? 'Processing'
    : redirecting
      ? 'Opening secure payment'
      : payment.mode === 'pay_at_hotel'
        ? 'Reserve now'
        : method === 'bank_transfer'
          ? (bank ? 'Submit transfer details' : 'Continue to bank details')
          : payment.mode === 'deposit'
            ? `Pay deposit ${formatMinor(payment.dueNowMinor)}`
            : `Pay ${formatMinor(payment.dueNowMinor)} securely`

  const action = (
    <Button type="submit" form="checkout-form" size="lg" className="w-full" loading={busy || redirecting} disabled={disabledAction}>
      {label}
    </Button>
  )

  const steps: StepInfo[] = [
    { id: 'details', label: 'Your details', state: detailsValid ? 'complete' : 'current' },
    ...(showExtras ? [{ id: 'extras', label: 'Extras', state: (detailsValid ? 'complete' : 'upcoming') as StepInfo['state'] }] : []),
    { id: 'payment', label: 'Payment', state: detailsValid ? 'current' : 'upcoming' },
  ]

  const summaryProps = {
    room, stay, quote: quoteLoading ? null : ok, hotelTimes, holdSeconds: ok.holdSeconds, confirmationMode: ok.confirmationMode,
    hold: holdActive ? { remainingMs: hold.remainingMs, expiring: hold.expiring, expired: hold.expired } : null,
  }

  let main: React.ReactNode
  if (phase.name === 'confirming') {
    main = <ConfirmingScreen timedOut={timedOut} checking={false} onCheckAgain={() => { setTimedOut(false); setPollNonce((n) => n + 1) }} />
  } else if (phase.name === 'transfer-submitted' && reservation) {
    main = <TransferSubmittedScreen reference={reservation.reference} confirmationHref={confirmationHref(reservation.reference)} />
  } else if (phase.name === 'request-received' && reservation) {
    main = <RequestReceivedScreen reason={phase.reason} reference={reservation.reference} confirmationHref={confirmationHref(reservation.reference)} />
  } else if (redirecting) {
    main = (
      <Banner tone="info" title="Taking you to the secure payment page">
        <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />Please do not close this page.</p>
      </Banner>
    )
  } else if (priceChange) {
    main = <PriceUpdatedPanel previousMinor={priceChange.previousTotalMinor} currentMinor={priceChange.currentTotalMinor} onAccept={() => setAccepted(true)} changeHref={`/rooms/${room.slug}?${staySearch}`} />
  } else {
    main = (
      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {expired && <motion.div key="expired" {...bannerMotion} transition={bannerTransition}><ExpiredPanel onRestart={restart} busy={busy} /></motion.div>}
          {!expired && hold.expiring && holdActive && <motion.div key="expiring" {...bannerMotion} transition={bannerTransition}><ExpiringBanner /></motion.div>}
          {phase.name === 'failed' && !expired && (
            <motion.div key="failed" {...bannerMotion} transition={bannerTransition}>
              <FailedPanel reason={phase.reason} holdActive={holdActive} onRetry={retryPayment} onSwitch={switchMethod} busy={busy} />
            </motion.div>
          )}
          {netError && <motion.div key="net" {...bannerMotion} transition={bannerTransition}><NetworkErrorBanner message={netError} onRetry={() => void submit()} busy={busy} /></motion.div>}
          {quoteFailed && (
            <motion.div key="quotefailed" {...bannerMotion} transition={bannerTransition}>
              <Banner role="alert" tone="danger" title="We couldn't update your price" actions={<Button variant="secondary" size="sm" onClick={() => setQuoteFailed(false)}>Dismiss</Button>}>
                <p>Your last change may not be included in the total. Change it again to retry.</p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>
        <ErrorSummary ref={summaryRef} errors={summaryItems} />

        <form id="checkout-form" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-10">
          {locked && !expired && (
            <p className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-paper p-4 text-small">
              <span>Your details are locked while we hold your room. To change them, start again.</span>
              <Button variant="secondary" size="sm" onClick={restart} loading={busy}>Start again</Button>
            </p>
          )}
          {resumed && (
            <p className="rounded-control bg-paper p-4 text-small">Your details are saved and your room is held. Choose how to pay below.</p>
          )}
          <fieldset disabled={locked || expired} hidden={resumed} className="min-w-0 space-y-10 border-0 p-0">
            <legend className="sr-only">Your details and extras</legend>
            <DetailsStep
              values={values} errors={errors} disabled={locked || expired} onChange={onChange} onBlur={onBlur}
              stay={stay} editHref={`/rooms/${room.slug}?${staySearch}`} website={website} onWebsite={setWebsite}
            />
            {showExtras && (
              <ExtrasStep
                catalog={catalog} quantities={quantities} lineTotals={lineTotals} guests={guests} disabled={locked || expired}
                onQuantity={(id, q) => setQuantities((s) => ({ ...s, [id]: q }))}
                extraBed={{ ...ok.extraBed, selected: extraBed }}
                onExtraBed={setExtraBed}
              />
            )}
          </fieldset>
          <PaymentStep
            payment={payment} method={method} onMethod={chooseMethod} confirmationMode={ok.confirmationMode}
            terms={terms} onTerms={(v) => { setTerms(v); if (v) setTermsError(undefined) }} termsError={termsError}
            bank={bank} proof={{ file: proofFile, error: proofError, onFile: (f) => { setProofFile(f); setProofError(null) } }}
            disabled={expired} action={action}
          />
        </form>
      </div>
    )
  }

  const showBar = inForm && !priceChange && !expired

  const mainKey = priceChange ? 'price-change' : phase.name
  const panelMotion = reduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }
  const panelTransition = { duration: reduced ? 0 : 0.25, ease: EASE_OUT }

  return (
    <div className="container-page py-8 md:py-12">
      <p aria-live="polite" className="sr-only">{hold.announcement}</p>
      {inForm && !priceChange && (
        <div className="mb-8 space-y-6">
          <h1 className="font-display text-h2">Complete your booking</h1>
          <ProgressSteps steps={steps} />
        </div>
      )}
      <div className="mb-6"><MobileSummary {...summaryProps} /></div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-12">
        <div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mainKey} {...panelMotion} transition={panelTransition}>
              {main}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside aria-label="Booking summary" className="hidden lg:sticky lg:top-6 lg:block">
          <SummaryCard {...summaryProps} />
        </aside>
      </div>

      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[5.5rem] pt-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-small">
              <span className="block text-muted">{payment.mode === 'pay_at_hotel' ? 'Pay at hotel' : 'Due now'}</span>
              <span className="font-semibold tabular-nums">{formatMinor(payment.mode === 'pay_at_hotel' ? payment.totalMinor : payment.dueNowMinor)}</span>
            </p>
            <div className="min-w-0 flex-1">{action}</div>
          </div>
        </div>
      )}
    </div>
  )
}

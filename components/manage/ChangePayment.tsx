'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CreditCard, Landmark, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { newKey } from '@/lib/checkout/client'
import { checkProofFile, MAX_PROOF_BYTES } from '@/lib/checkout/schemas'
import { formatCountdown } from '@/lib/checkout/format'
import { manageApi, ManageFailure } from '@/lib/manage/client'
import type { PendingChangeView } from '@/lib/manage/types'
import { formatRange } from '@/lib/room-query'
import { formatMinor } from '@/lib/stay-types'
import type { PaymentMethod } from '@/lib/checkout/types'
import { EASE_OUT } from '../motion/variants'
import { Banner } from '../checkout/CheckoutStates'
import { Field } from '../checkout/Field'
import { CopyButton } from '../checkout/PaymentStep'
import { useHoldCountdown } from '../checkout/useHoldCountdown'
import { Button } from '../ui/Button'

interface ChangePaymentProps {
  reference: string
  change: PendingChangeView
  csrf: string
  demo: string | null
  /** Reloads the booking so the new status shows. */
  onRefresh: () => Promise<void>
  onSessionExpired: () => void
}

/**
 * The payment step for a date change. It reuses the checkout payment endpoint (card or USSD, or bank transfer).
 * The new dates are held while the guest pays; the old dates stay valid until the payment is complete.
 */
export function ChangePayment({ reference, change, csrf, demo, onRefresh, onSessionExpired }: ChangePaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>(change.acceptedMethods[0] ?? 'online')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const key = useRef(newKey())
  const hold = useHoldCountdown(Date.parse(change.holdExpiresAt), 0)
  const reduced = useReducedMotion()
  const panelMotion = reduced ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: EASE_OUT } }

  function fail(e: unknown) {
    const f = e instanceof ManageFailure ? e : null
    if (f?.sessionExpired) return onSessionExpired()
    if (!f || f.network || f.status >= 500) setError("We couldn't reach the server. Trying again is safe: it will not take the payment twice.")
    else {
      key.current = newKey()
      setError(f.body?.message ?? 'Something went wrong.')
    }
  }

  async function pay() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const init = await manageApi.initChangePayment(reference, { changeId: change.changeId, method, idempotencyKey: key.current }, csrf, demo)
      if (init.kind === 'redirect') {
        window.location.assign(init.url) // the provider's hosted checkout. Only its verified webhook confirms the payment.
        return
      }
      key.current = newKey()
      await onRefresh()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  async function sendProof() {
    if (!file) return setFileError('Choose your transfer receipt to upload.')
    const problem = checkProofFile(file)
    if (problem) return setFileError(problem)
    setFileError(null)
    setBusy(true)
    try {
      await manageApi.uploadChangeProof(reference, change.changeId, file, csrf, demo)
      await onRefresh()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const choosing = change.method === null && change.status === 'awaiting_payment'
  const holdLine = hold.expired
    ? 'The hold on your new dates has ended. Your current dates are unchanged.'
    : `We're holding your new dates (${formatRange(change.checkIn, change.checkOut)}): ${formatCountdown(hold.remainingMs ?? 0)}. Your current dates stay valid until the payment is complete.`
  const statusKey = change.status === 'awaiting_verification' ? 'verification' : change.status === 'awaiting_payment' && !choosing ? 'confirming' : change.status === 'awaiting_transfer' && change.bank ? 'transfer' : 'choose'

  return (
    <section aria-labelledby="change-pay-title" className="space-y-4">
      <h3 id="change-pay-title" className="font-semibold">Pay {formatMinor(change.amountDueMinor)} for your new dates</h3>
      <p role="status" className={`rounded-control p-3 text-small ${hold.expiring ? 'bg-danger/5 font-semibold text-danger' : 'bg-paper'}`}>{holdLine}</p>

      {change.status === 'payment_failed' && <Banner role="alert" tone="danger" title="The payment didn't go through"><p>Your current dates are unchanged. You can try again while the hold lasts.</p></Banner>}
      {error && <Banner role="alert" tone="danger" title="That did not go through"><p>{error}</p></Banner>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={statusKey} {...panelMotion}>
      {change.status === 'awaiting_verification' ? (
        <Banner tone="info" title="Awaiting verification"><p>We have your receipt. The hotel verifies it, then your new dates take effect. Your current dates stay valid until then.</p></Banner>
      ) : change.status === 'awaiting_payment' && !choosing ? (
        <Banner tone="info" title="Confirming your payment"><p>Please keep this page open. It updates by itself when your payment provider confirms.</p></Banner>
      ) : change.status === 'awaiting_transfer' && change.bank ? (
        <div className="space-y-4 rounded-card border border-line bg-paper p-4 text-small">
          <p className="font-semibold">Transfer to this account</p>
          <dl className="space-y-3">
            {([['Bank', change.bank.details.bankName, null], ['Account name', change.bank.details.accountName, null], ['Account number', change.bank.details.accountNumber, 'account number'], ['Exact amount', formatMinor(change.bank.amountMinor), 'amount'], ['Reference', reference, 'reference']] as [string, string, string | null][]).map(([term, value, copy]) => (
              <div key={term} className="flex items-center justify-between gap-3">
                <div className="min-w-0"><dt className="text-muted">{term}</dt><dd className="break-words font-semibold tabular-nums">{value}</dd></div>
                {copy && <CopyButton value={value} label={copy} />}
              </div>
            ))}
          </dl>
          <Field id="change-proof" label="Upload your receipt" error={fileError ?? undefined} hint={`JPG, PNG, WebP or PDF, up to ${MAX_PROOF_BYTES / 1024 / 1024} MB.`}>
            {(a) => <input {...a} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setFileError(null) }} className="block min-h-12 w-full cursor-pointer rounded-control border border-ink/60 bg-surface text-small file:mr-4 file:min-h-12 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:font-semibold file:text-paper" />}
          </Field>
          <Button loading={busy} icon={<Upload className="size-4" aria-hidden />} disabled={hold.expired} onClick={sendProof}>Submit transfer details</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="mb-2 font-semibold">How would you like to pay?</legend>
            {change.acceptedMethods.map((m) => (
              <label key={m} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-card border p-4 ${method === m ? 'border-2 border-ink bg-paper' : 'border-ink/40 bg-surface'}`}>
                <input type="radio" name="change-method" checked={method === m} onChange={() => setMethod(m)} className="mt-1 size-5 shrink-0 accent-ink" />
                <span className="mt-0.5 text-accent-ink">{m === 'online' ? <CreditCard className="size-5" aria-hidden /> : <Landmark className="size-5" aria-hidden />}</span>
                <span>
                  <span className="block font-semibold">{m === 'online' ? 'Card or USSD' : 'Bank transfer'}</span>
                  <span className="block text-small text-muted">{m === 'online' ? `Pay on ${change.providerName}'s secure page. We never see your card details.` : 'Transfer to the hotel and upload your receipt.'}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button size="lg" className="w-full" loading={busy} disabled={hold.expired} onClick={pay}>
            {method === 'bank_transfer' ? 'Continue to bank details' : `Pay ${formatMinor(change.amountDueMinor)} securely`}
          </Button>
        </div>
      )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

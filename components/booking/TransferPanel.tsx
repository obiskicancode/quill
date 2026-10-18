'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { config } from '@/config'
import { checkoutService } from '@/app/api/services/checkout.service'
import { ServiceError } from '@/app/api/services/base.service'
import { checkProofFile, MAX_PROOF_BYTES } from '@/schemas/checkout.schema'
import { formatMinor } from '@/types/stay.types'
import type { GuestReservation } from '@/types/booking.types'
import { Field } from '../checkout/Field'
import { CopyButton } from '../checkout/PaymentStep'
import { EASE_OUT } from '../motion/variants'
import { Button } from '../ui/Button'

/** Bank details, exact amount and reference, plus the receipt upload when no proof has been sent yet. */
export function TransferPanel({ v, onUploaded }: { v: GuestReservation; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reduced = useReducedMotion()
  if (!v.bank) return null

  const rows: [string, string, string | null][] = [
    ['Bank', v.bank.details.bankName, null],
    ['Account name', v.bank.details.accountName, null],
    ['Account number', v.bank.details.accountNumber, 'account number'],
    ['Exact amount', formatMinor(v.bank.amountMinor), 'amount'],
    ['Reference (use it in the transfer note)', v.reference, 'reference'],
  ]

  async function submit() {
    if (!file) return setError('Choose your transfer receipt to upload.')
    const problem = checkProofFile(file)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      // Dev preview reference has no stored reservation, so the upload is simulated.
      if (config.isDev && v.reference === 'DEMO-01') await new Promise((r) => setTimeout(r, 600))
      else await checkoutService.uploadProof(v.reference, file)
      onUploaded()
    } catch (e) {
      setError(e instanceof ServiceError && e.body?.message ? e.body.message : "We couldn't upload the receipt. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-card border border-line bg-paper p-5 text-ink">
      <h2 className="font-semibold">Transfer to this account</h2>
      <dl className="space-y-3 text-small">
        {rows.map(([term, value, copy]) => (
          <div key={term} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-muted">{term}</dt>
              <dd className="break-words font-semibold tabular-nums">{value}</dd>
            </div>
            {copy && <CopyButton value={value} label={copy} />}
          </div>
        ))}
      </dl>
      <AnimatePresence mode="wait" initial={false}>
        {v.proofUploaded ? (
          <motion.div key="uploaded" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}>
            <p className="text-small font-medium">We have your receipt. The hotel will verify it and email you.</p>
          </motion.div>
        ) : (
          <motion.div key="upload" className="space-y-4" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}>
            <Field id="field-proof" label="Upload your receipt" error={error ?? undefined} hint={`JPG, PNG, WebP or PDF, up to ${MAX_PROOF_BYTES / 1024 / 1024} MB.`}>
              {(a) => (
                <input
                  {...a}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null)
                    setError(null)
                  }}
                  className="block min-h-12 w-full cursor-pointer rounded-control border border-ink/60 bg-surface text-small file:mr-4 file:min-h-12 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:font-semibold file:text-paper"
                />
              )}
            </Field>
            <Button loading={busy} icon={<Upload className="size-4" aria-hidden />} onClick={submit}>Submit transfer details</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

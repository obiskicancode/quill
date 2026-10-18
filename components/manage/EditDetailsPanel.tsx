'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { newKey } from '@/app/api/services/checkout.service'
import { detailsPatchSchema, type GuestInput } from '@/schemas/checkout.schema'
import { manageService } from '@/app/api/services/manage.service'
import { ServiceError } from '@/app/api/services/base.service'
import { whatsappHref } from '@/lib/site'
import type { GuestReservation } from '@/types/booking.types'
import { EASE_OUT } from '../motion/variants'
import { VerifyForm } from '../booking/VerifyForm'
import { Banner } from '../checkout/CheckoutStates'
import { DetailsStep, type GuestField } from '../checkout/DetailsStep'
import { Button, ButtonLink } from '../ui/Button'

const EDITABLE: GuestField[] = ['fullName', 'country', 'phone', 'arrivalTime', 'specialRequests']

interface EditDetailsPanelProps {
  v: GuestReservation
  csrf: string
  demo: string | null
  onSaved: (next: GuestReservation) => void
  onClose: () => void
  sessionExpired: boolean
  onSessionExpired: () => void
  onReverified: () => void
}

/** Edit name, phone, country, arrival time and special requests. Same validation as checkout. Email is read-only. */
export function EditDetailsPanel({ v, csrf, demo, onSaved, onClose, sessionExpired, onSessionExpired, onReverified }: EditDetailsPanelProps) {
  const m = v.manage!
  const initial: GuestInput = { ...m.editable, email: m.contact.email }
  const [values, setValues] = useState<GuestInput>(initial)
  const [saved, setSaved] = useState<GuestInput>(initial)
  const [errors, setErrors] = useState<Partial<Record<GuestField, string>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const key = useRef(newKey())
  const reduced = useReducedMotion()
  const panelMotion = reduced ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: EASE_OUT } }

  const dirty = EDITABLE.some((f) => (values[f] ?? '') !== (saved[f] ?? ''))
  const issues = (val: GuestInput) => {
    const out: Partial<Record<GuestField, string>> = {}
    const r = detailsPatchSchema.safeParse(val)
    if (!r.success) for (const i of r.error.issues) out[i.path[0] as GuestField] ??= i.message
    return out
  }

  async function save() {
    if (busy || !dirty) return
    const found = issues(values)
    setErrors(found)
    const first = EDITABLE.find((f) => found[f])
    if (first) return void document.getElementById(`field-${first}`)?.focus()
    setBusy(true)
    setError(null)
    setJustSaved(false)
    try {
      const next = (await manageService.saveDetails(v.reference, {
        idempotencyKey: key.current,
        details: { fullName: values.fullName, country: values.country, phone: values.phone, arrivalTime: values.arrivalTime, specialRequests: values.specialRequests },
      }, csrf, demo)).data
      setSaved(values)
      key.current = newKey()
      setJustSaved(true)
      onSaved(next)
    } catch (e) {
      const f = e instanceof ServiceError ? e : null
      if (f?.body?.code === 'session_expired') onSessionExpired()
      else if (f?.body?.code === 'validation' && f.body.fieldErrors) {
        setErrors(f.body.fieldErrors as Partial<Record<GuestField, string>>)
        key.current = newKey()
      } else if (!f || f.network || f.status >= 500) setError({ message: "We couldn't reach the server, so we don't know if your changes were saved. Trying again is safe.", retryable: true })
      else {
        key.current = newKey()
        setError({ message: f.body?.message ?? 'We could not save your changes.', retryable: false })
      }
    } finally {
      setBusy(false)
    }
  }

  if (sessionExpired) {
    return (
      <section className="rounded-card border border-line bg-surface p-5 shadow-raised md:p-6 print:hidden">
        <VerifyForm embedded scope="manage" variant="verify" reference={v.reference} notice="Your session ended. Verify again to save. What you typed is kept." onVerified={onReverified} />
      </section>
    )
  }

  return (
    <section aria-labelledby="edit-title" className="rounded-card border border-line bg-surface p-5 shadow-raised md:p-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="edit-title" className="font-display text-h3">Edit details</h2>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>Close</Button>
      </div>

      <form noValidate onSubmit={(e) => { e.preventDefault(); void save() }} className="mt-5 space-y-6">
        <DetailsStep
          mode="edit"
          reference={v.reference}
          values={values}
          errors={errors}
          disabled={busy}
          onChange={(name, val) => { setValues((x) => ({ ...x, [name]: val })); setJustSaved(false); if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined })) }}
          onBlur={(name) => { if (name !== 'email') setErrors((x) => ({ ...x, [name]: issues(values)[name] })) }}
        />

        {Object.values(errors).some(Boolean) && <p role="alert" className="text-small font-medium text-danger">Please fix the highlighted fields.</p>}
        <AnimatePresence initial={false}>
          {error && (
            <motion.div {...panelMotion}>
              <Banner role="alert" tone="danger" title="Your changes were not saved" actions={error.retryable ? <Button variant="secondary" size="sm" loading={busy} onClick={() => void save()}>Try again</Button> : undefined}>
                <p>{error.message}</p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>
        <p role="status" aria-live="polite" className={justSaved ? 'rounded-control bg-paper p-3 text-small font-semibold' : 'sr-only'}>
          <AnimatePresence initial={false}>
            {justSaved && <motion.span key="saved" {...panelMotion}>Details saved. We emailed you a summary.</motion.span>}
          </AnimatePresence>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" loading={busy} disabled={!dirty}>Save changes</Button>
          <span className="text-small text-muted">{dirty ? 'You have unsaved changes.' : 'No changes yet.'}</span>
        </div>
      </form>

      <div className="mt-6 border-t border-line pt-4 text-small">
        <p className="font-semibold">Need to change something else?</p>
        <p className="mt-1 text-ink/85">The number of guests, the room type and prices can&rsquo;t be changed here.</p>
        <div className="mt-3">
          <ButtonLink href={whatsappHref(`Hello, I need to change the guests, room or price on booking ${v.reference}.`)} external variant="secondary" size="sm">Message the hotel<span className="sr-only"> (opens in a new tab)</span></ButtonLink>
        </div>
      </div>
    </section>
  )
}

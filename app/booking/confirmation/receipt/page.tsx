import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PrintReceiptButton } from '@/components/booking/PrintReceiptButton'
import { CheckoutShell } from '@/components/checkout/CheckoutShell'
import { PriceBreakdown } from '@/components/room-detail/PriceBreakdown'
import { referenceSchema } from '@/lib/booking/schemas'
import { getAccess } from '@/lib/booking/session'
import { buildGuestReservation, isDemoRef, loadReservation } from '@/lib/booking/view'
import { formatRange } from '@/lib/room-query'
import { formatMinor } from '@/lib/stay-types'
import '../print.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Receipt', robots: { index: false, follow: false } }

/** A print-friendly receipt. Opens in a new tab; guests use Print or Save as PDF. */
export default async function ReceiptPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const raw = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref
  const parsed = referenceSchema.safeParse(raw ?? '')
  if (!parsed.success) redirect('/booking/confirmation')
  const reference = parsed.data
  const demo = isDemoRef(reference) ? (Array.isArray(sp.demo) ? sp.demo[0] : sp.demo) ?? null : null

  const level = isDemoRef(reference) ? 'checkout' : await getAccess(reference)
  const stored = level ? await loadReservation(reference, demo) : null
  if (!level || !stored) redirect(`/booking/confirmation?ref=${encodeURIComponent(reference)}`)
  const v = buildGuestReservation(stored, level)
  const row = 'flex justify-between gap-6 border-b border-line py-2'

  return (
    <CheckoutShell label="Receipt" backToHome>
      <div className="receipt-page container-page max-w-2xl py-8 md:py-12">
        <article className="receipt-doc space-y-6 rounded-card border border-line bg-surface p-6 md:p-8" aria-label="Receipt">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <h1 className="font-display text-h2">Receipt</h1>
              <p className="mt-1 font-semibold">{v.hotel.name}</p>
              <p className="text-small text-muted">{v.hotel.addressLines.join(', ')}</p>
            </div>
            <div className="text-right text-small">
              <p className="text-muted">Booking reference</p>
              <p className="font-display text-h3">{v.reference}</p>
              <p className="mt-1 text-muted">Issued {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <dl className="text-small">
            <div className={row}><dt>Guest</dt><dd>{v.guest.fullName}</dd></div>
            <div className={row}><dt>Room</dt><dd>{v.room.name}</dd></div>
            <div className={row}><dt>Stay</dt><dd>{v.stay.checkIn && v.stay.checkOut ? `${formatRange(v.stay.checkIn, v.stay.checkOut)} (${v.stay.nights} nights)` : 'To be confirmed'}</dd></div>
            <div className={row}><dt>Status</dt><dd className="font-semibold">{v.payment.label}</dd></div>
          </dl>

          <PriceBreakdown quote={v.breakdown} />

          <dl className="text-small">
            <div className={row}><dt>Amount paid</dt><dd className="font-semibold tabular-nums">{formatMinor(v.amounts.paidMinor)}</dd></div>
            {v.amounts.balanceMinor > 0 && <div className={row}><dt>Balance due at the hotel</dt><dd className="font-semibold tabular-nums">{formatMinor(v.amounts.balanceMinor)}</dd></div>}
            <div className={row}><dt>Payment method</dt><dd>{v.payment.methodLabel}</dd></div>
            {v.payment.reference && <div className={row}><dt>Payment reference</dt><dd className="tabular-nums">{v.payment.reference}</dd></div>}
          </dl>
        </article>
        <div className="mt-6 flex justify-center"><PrintReceiptButton /></div>
      </div>
    </CheckoutShell>
  )
}

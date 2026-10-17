import type { Metadata } from 'next'
import { CheckoutShell } from '@/components/checkout/CheckoutShell'
import { ManageGate } from '@/components/manage/ManageGate'
import { referenceSchema } from '@/lib/booking/schemas'
import { getManageSession } from '@/lib/booking/session'
import { buildGuestReservation, isDemoRef, loadReservation } from '@/lib/booking/view'
import { manageOpts } from '@/lib/manage/auth'
import type { GuestReservation } from '@/lib/booking/types'
import '../confirmation/print.css'

// No personal data may be cached or indexed.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage your booking', robots: { index: false, follow: false } }

type SearchParams = Record<string, string | string[] | undefined>

export default async function ManagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const get = (name: string): string | null => {
    const v = sp[name]
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
  }

  // ?ref= only pre-fills the lookup form. Only a live session cookie opens a booking.
  const parsed = referenceSchema.safeParse(get('ref') ?? '')
  const reference = parsed.success ? parsed.data : ''
  const demo = reference && isDemoRef(reference) ? get('demo') : null

  let initial: GuestReservation | null = null
  if (reference) {
    if (isDemoRef(reference)) {
      if (demo !== 'lookup') {
        if (demo?.split(',').includes('slowload')) await new Promise((r) => setTimeout(r, 3000))
        const stored = await loadReservation(reference, demo)
        const opts = await manageOpts(reference)
        if (stored) initial = buildGuestReservation(stored, 'verified', { manage: opts })
      }
    } else if (await getManageSession(reference)) {
      const stored = await loadReservation(reference, null)
      const opts = await manageOpts(reference)
      if (stored && opts) initial = buildGuestReservation(stored, 'verified', { manage: opts })
    }
  }

  return (
    <CheckoutShell label="Manage booking" backToHome>
      <ManageGate initial={initial} reference={reference} demo={demo} notice={demo === 'lookup' ? 'Your session ended for your security. Please look up your booking again.' : undefined} />
    </CheckoutShell>
  )
}

import { formatDeadline } from '@/lib/checkout/format'
import type { GuestReservation } from '@/lib/booking/types'
import { formatMinor } from '@/lib/stay-types'
import type { CancellationPreview } from '@/lib/manage/types'
import { TextLink } from '../ui/TextLink'

/** Shows the policy snapshot saved on the reservation, never the hotel's current settings. */
export function PolicySection({ v, refundNow }: { v: GuestReservation; /** Manage page: what cancelling right now would do. */ refundNow?: CancellationPreview | null }) {
  const c = v.policy.cancellation
  const headline = c.nonRefundable ? 'Non-refundable' : c.freeCancellationUntil ? `Free cancellation until ${formatDeadline(c.freeCancellationUntil)}` : c.note
  return (
    <section aria-labelledby="policy-title" className="rounded-card border border-line bg-surface p-5 shadow-raised md:p-6">
      <h2 id="policy-title" className="font-display text-h3">Policies</h2>
      <p className="mt-4 rounded-control bg-paper p-4 font-semibold">{headline}</p>
      {c.freeCancellationUntil && <p className="mt-2 text-small text-muted">After that, cancellation charges apply.</p>}
      {refundNow && (
        <div className="mt-4 rounded-control border border-line p-4 text-small">
          <p className="font-semibold">If you cancelled right now</p>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between gap-4"><dt className="text-muted">You would get back</dt><dd className="font-semibold tabular-nums">{formatMinor(refundNow.refundMinor)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">The hotel would keep</dt><dd className="tabular-nums">{formatMinor(refundNow.retainedMinor)}</dd></div>
          </dl>
          <p className="mt-2 text-ink/85">{refundNow.rule}</p>
        </div>
      )}
      <dl className="mt-5 space-y-3 text-small">
        <div><dt className="font-semibold">Check-in</dt><dd className="text-ink/85">{v.policy.checkInRules}</dd></div>
        <div><dt className="font-semibold">Check-out</dt><dd className="text-ink/85">{v.policy.checkOutRules}</dd></div>
        <div>
          <dt className="font-semibold">House rules</dt>
          <dd><ul className="mt-1 list-disc space-y-1 pl-5 text-ink/85">{v.policy.houseRules.map((r) => <li key={r}>{r}</li>)}</ul></dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-wrap gap-x-6 print:hidden">
        <li><TextLink href="/policies/cancellation-policy" external>Cancellation Policy<span className="sr-only"> (opens in a new tab)</span></TextLink></li>
        <li><TextLink href="/policies/terms" external>Terms<span className="sr-only"> (opens in a new tab)</span></TextLink></li>
        <li><TextLink href="/policies/privacy" external>Privacy Policy<span className="sr-only"> (opens in a new tab)</span></TextLink></li>
      </ul>
    </section>
  )
}

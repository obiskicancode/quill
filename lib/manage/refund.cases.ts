import { calculateRefund, type RefundInput } from './refund'
import type { RefundKind } from '@/types/manage.types'

/**
 * Test cases for calculateRefund: every policy type and payment mode.
 * Money in kobo. Hotel "today" is 2026-11-01 at 10:00. `firstNight` is 5,000,000 of a 15,000,000 total.
 */
const base: RefundInput = {
  policy: { cancellation: { nonRefundable: false, freeCancellationUntil: { date: '2026-11-12', time: '14:00' }, note: '' }, afterDeadline: { kind: 'first_night' } },
  mode: 'full',
  method: 'online',
  paidMinor: 15_000_000,
  totalMinor: 15_000_000,
  firstNightMinor: 5_000_000,
  clock: { today: '2026-11-01', minutes: 600 },
  timelines: { original: '5 to 10 business days', manual: '7 to 14 business days' },
}
const late = { today: '2026-11-12', minutes: 15 * 60 } // an hour after the free window ends

export interface RefundCase {
  name: string
  input: RefundInput
  expect: { kind: RefundKind; refundMinor: number; retainedMinor: number }
}

export const refundCases: RefundCase[] = [
  { name: 'Free cancellation, paid in full online', input: base, expect: { kind: 'free', refundMinor: 15_000_000, retainedMinor: 0 } },
  { name: 'Free cancellation, last minute of the window (14:00 exactly)', input: { ...base, clock: { today: '2026-11-12', minutes: 14 * 60 } }, expect: { kind: 'free', refundMinor: 15_000_000, retainedMinor: 0 } },
  { name: 'Partial: window ended, first night kept', input: { ...base, clock: late }, expect: { kind: 'partial', refundMinor: 10_000_000, retainedMinor: 5_000_000 } },
  { name: 'Partial: window ended, 50% kept', input: { ...base, clock: late, policy: { ...base.policy, afterDeadline: { kind: 'percent', percent: 50 } } }, expect: { kind: 'partial', refundMinor: 7_500_000, retainedMinor: 7_500_000 } },
  { name: 'Non-refundable by policy (still cancellable, nothing back)', input: { ...base, policy: { cancellation: { nonRefundable: true, freeCancellationUntil: null, note: '' }, afterDeadline: { kind: 'full' } } }, expect: { kind: 'non_refundable', refundMinor: 0, retainedMinor: 15_000_000 } },
  { name: 'Window ended and the whole stay is kept', input: { ...base, clock: late, policy: { ...base.policy, afterDeadline: { kind: 'full' } } }, expect: { kind: 'non_refundable', refundMinor: 0, retainedMinor: 15_000_000 } },
  { name: 'Deposit only, free cancellation (deposit returned)', input: { ...base, mode: 'deposit', paidMinor: 4_500_000 }, expect: { kind: 'deposit_only', refundMinor: 4_500_000, retainedMinor: 0 } },
  { name: 'Deposit only, after the window: first night exceeds the deposit, so the deposit is kept', input: { ...base, mode: 'deposit', paidMinor: 4_500_000, clock: late }, expect: { kind: 'deposit_only', refundMinor: 0, retainedMinor: 4_500_000 } },
  { name: 'Pay at hotel: nothing paid, nothing refunded', input: { ...base, mode: 'pay_at_hotel', method: null, paidMinor: 0 }, expect: { kind: 'pay_at_hotel', refundMinor: 0, retainedMinor: 0 } },
  { name: 'Unpaid: payment still awaited', input: { ...base, paidMinor: 0 }, expect: { kind: 'unpaid', refundMinor: 0, retainedMinor: 0 } },
  { name: 'Bank transfer, free cancellation (manual refund)', input: { ...base, method: 'bank_transfer' }, expect: { kind: 'bank_transfer', refundMinor: 15_000_000, retainedMinor: 0 } },
  { name: 'Bank transfer, partial (manual refund of the rest)', input: { ...base, method: 'bank_transfer', clock: late }, expect: { kind: 'bank_transfer', refundMinor: 10_000_000, retainedMinor: 5_000_000 } },
  { name: 'Bank transfer, non-refundable (nothing to refund)', input: { ...base, method: 'bank_transfer', policy: { cancellation: { nonRefundable: true, freeCancellationUntil: null, note: '' }, afterDeadline: { kind: 'full' } } }, expect: { kind: 'non_refundable', refundMinor: 0, retainedMinor: 15_000_000 } },
]

export function runRefundCases(): { name: string; ok: boolean; got?: unknown }[] {
  return refundCases.map((c) => {
    const r = calculateRefund(c.input)
    const ok = r.kind === c.expect.kind && r.refundMinor === c.expect.refundMinor && r.retainedMinor === c.expect.retainedMinor
    return ok ? { name: c.name, ok } : { name: c.name, ok, got: { kind: r.kind, refundMinor: r.refundMinor, retainedMinor: r.retainedMinor } }
  })
}

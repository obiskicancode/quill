import { Check } from 'lucide-react'
import type { GuestReservation, HeaderKind } from '@/types/booking.types'
import { formatMinor } from '@/types/stay.types'
import { whatsappHref } from '@/lib/site'
import { StaggerGroup, StaggerItem } from '../motion'

interface Step {
  title: string
  state: 'done' | 'now' | 'next'
}

function stepsFor(kind: HeaderKind, v: GuestReservation): Step[] {
  const arrive: Step = { title: `Arrive from ${v.times.checkIn}${v.policy.idRequired ? ' with a valid photo ID' : ''}.`, state: 'next' }
  const balance: Step[] = v.amounts.balanceMinor > 0 ? [{ title: `Pay the balance of ${formatMinor(v.amounts.balanceMinor)} at the hotel.`, state: 'next' }] : []
  switch (kind) {
    case 'confirmed':
    case 'confirmed-deposit':
      return [{ title: 'Confirmation email sent.', state: 'done' }, { title: 'We send you a reminder before you arrive.', state: 'next' }, arrive, ...balance]
    case 'confirming':
      return [{ title: 'Your payment provider confirms the payment. This is happening now.', state: 'now' }, { title: 'We email your confirmation.', state: 'next' }, arrive]
    case 'transfer':
      return [
        { title: v.proofUploaded ? 'Receipt received.' : 'Make the transfer and upload your receipt.', state: v.proofUploaded ? 'done' : 'now' },
        { title: 'The hotel verifies your transfer.', state: v.proofUploaded ? 'now' : 'next' },
        { title: 'We email your confirmation.', state: 'next' },
        arrive,
      ]
    case 'approval':
      return [{ title: `The hotel reviews your request, usually ${v.approvalResponse}.`, state: 'now' }, { title: 'We email you once it is approved.', state: 'next' }, arrive, ...balance]
    case 'pay-at-hotel':
      return [{ title: 'Booking details emailed to you.', state: 'done' }, { title: 'The hotel confirms by email.', state: 'now' }, arrive, ...balance]
    default:
      return [{ title: 'Choose Book again to pick your dates and pay.', state: 'now' }, { title: 'Or contact the hotel and we will help.', state: 'next' }]
  }
}

export function NextSteps({ v, kind }: { v: GuestReservation; kind: HeaderKind }) {
  const steps = stepsFor(kind, v)
  return (
    <section aria-labelledby="next-title" className="rounded-card border border-line bg-surface p-5 shadow-raised md:p-6">
      <h2 id="next-title" className="font-display text-h3">What happens next</h2>
      <StaggerGroup as="ol" staggerChildren={0.06} className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <StaggerItem key={i} as="li" className="flex gap-4">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-small font-semibold ${s.state === 'done' ? 'bg-ink text-paper' : s.state === 'now' ? 'bg-accent text-ink' : 'border border-ink/50 text-muted'}`}>
              {s.state === 'done' ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <p className={`pt-1 ${s.state === 'next' ? 'text-ink/85' : 'font-semibold'}`}>
              {s.title}
              <span className="sr-only">{s.state === 'done' ? ' (done)' : s.state === 'now' ? ' (in progress)' : ''}</span>
            </p>
          </StaggerItem>
        ))}
      </StaggerGroup>
      {kind !== 'ended' && (
        <div className="mt-6 space-y-2 border-t border-line pt-4 text-small">
          {v.policy.idRequired && <p><span className="font-semibold">ID at check-in: </span>{v.policy.idText}</p>}
          {v.guest.arrival && (
            <p>
              <span className="font-semibold">Your arrival: </span>{v.guest.arrival}.{' '}
              <a
                href={whatsappHref(`Hello, my plans changed for booking ${v.reference}. I will now arrive at: `)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-4"
              >
                Tell the hotel about changes<span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

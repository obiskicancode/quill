import { MessageCircle, Phone } from 'lucide-react'
import { formatRange } from '@/lib/room-query'
import type { ISODate } from '@/lib/dates'
import { site, telHref, whatsappHref } from '@/lib/site'
import { ButtonLink } from '../ui/Button'

export function AskCard({ roomName, checkIn, checkOut }: { roomName: string; checkIn: ISODate | null; checkOut: ISODate | null }) {
  const dates = checkIn && checkOut ? ` for ${formatRange(checkIn, checkOut)}` : ''
  const message = `Hello ${site.name}, I have a question about the ${roomName}${dates}.`
  return (
    <section aria-labelledby="ask-title" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
      <h2 id="ask-title" className="font-display text-h3">Ask about this room</h2>
      <p className="mt-2 max-w-prose text-ink/85">Questions about the bed, the view or a special request? We reply quickly on WhatsApp.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={whatsappHref(message)} external variant="secondary" icon={<MessageCircle className="size-5" aria-hidden />}>
          Ask on WhatsApp
        </ButtonLink>
        <ButtonLink href={telHref()} variant="secondary" icon={<Phone className="size-5" aria-hidden />}>
          Call reception
        </ButtonLink>
      </div>
    </section>
  )
}

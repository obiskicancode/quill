import { formatMinor } from '@/types/stay.types'
import type { HotelSettings, RoomDetail } from '@/lib/room-detail'
import { Reveal } from '../motion/Reveal'
import { StaggerGroup } from '../motion/StaggerGroup'
import { StaggerItem } from '../motion/StaggerItem'
import { TextLink } from '../ui/TextLink'

export function GoodToKnow({ room, hotel }: { room: RoomDetail; hotel: HotelSettings }) {
  const extraBed = room.extraBed.available
    ? room.extraBedPriceMinor
      ? `Available for ${formatMinor(room.extraBedPriceMinor)} per night. It sleeps one extra guest; the room's maximum is ${room.maxAdults + room.maxChildren} guests.`
      : `Available at no charge. It sleeps one extra guest; the room's maximum is ${room.maxAdults + room.maxChildren} guests.`
    : `Not available in this room. It sleeps up to ${room.maxAdults + room.maxChildren} guests.`

  const rows = [
    ['Check-in', `From ${hotel.checkInTime}`],
    ['Check-out', `By ${hotel.checkOutTime}`],
    ['Extra bed', extraBed],
    ['Children', hotel.childrenPolicy],
    ['Pets', hotel.petsPolicy],
    ['Smoking', hotel.smokingPolicy],
    ['ID at check-in', hotel.idPolicy],
  ]

  return (
    <>
      <section aria-labelledby="know-title">
        <h2 id="know-title" className="font-display text-h3">Good to know</h2>
        <StaggerGroup as="dl" className="mt-5 divide-y divide-line border-y border-line" staggerChildren={0.05}>
          {rows.map(([term, detail]) => (
            <StaggerItem as="div" key={term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="font-semibold">{term}</dt>
              <dd className="text-ink/85">{detail}</dd>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <Reveal>
        <section aria-labelledby="cancel-title">
          <h2 id="cancel-title" className="font-display text-h3">Cancellation</h2>
          <p className="mt-3 max-w-prose text-ink/85">{hotel.cancellationSummary}</p>
          <div className="mt-1">
            <TextLink href="/policies/cancellation-policy">Read the full cancellation policy</TextLink>
          </div>
        </section>
      </Reveal>
    </>
  )
}

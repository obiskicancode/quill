import { getRoomAmenities } from '@/lib/content/data'
import type { PreviewFlags } from '@/lib/content/preview'
import { AmenityItem } from '../AmenityItem'
import { TextLink } from '../ui/TextLink'

/** The in-room amenities most room types share, worked out from the real room data. */
export async function RoomAmenitiesSummary({ flags }: { flags: PreviewFlags }) {
  const items = await getRoomAmenities(flags)
  if (items.length === 0) return null
  return (
    <section aria-labelledby="room-amenities-title" className="section-y bg-surface">
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <h2 id="room-amenities-title" className="font-display text-h2">In every room</h2>
            <p className="mt-3 text-body-lg text-ink/85">What most of our rooms and apartments include.</p>
          </div>
          <TextLink href="/rooms">See all rooms</TextLink>
        </div>
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((a) => <AmenityItem key={a.key} amenity={a} tone="light" />)}
        </ul>
      </div>
    </section>
  )
}

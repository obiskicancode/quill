import { toFeatureRoom } from '@/lib/room-detail'
import type { RoomType } from '@/lib/rooms'
import { RoomCard } from '../RoomCard'

/** Compact cards (one secondary button each), so the only filled button on screen stays the booking one. */
export function SimilarRooms({ rooms, stayQuery }: { rooms: RoomType[]; stayQuery: string }) {
  if (rooms.length === 0) return null
  return (
    <section id="similar-rooms" aria-labelledby="similar-title" className="section-y pb-0">
      <div className="container-page">
        <h2 id="similar-title" className="mb-8 font-display text-h2">You may also like</h2>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <li key={r.id}>
              <RoomCard room={toFeatureRoom(r)} stayQuery={stayQuery} compact />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

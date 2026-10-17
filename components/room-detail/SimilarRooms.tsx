import { toFeatureRoom } from '@/lib/room-detail'
import type { RoomType } from '@/lib/rooms'
import { StaggerGroup } from '../motion/StaggerGroup'
import { StaggerItem } from '../motion/StaggerItem'
import { TextReveal } from '../motion/TextReveal'
import { Tilt } from '../motion/Tilt'
import { RoomCard } from '../RoomCard'

/** Compact cards (one secondary button each), so the only filled button on screen stays the booking one. */
export function SimilarRooms({ rooms, stayQuery }: { rooms: RoomType[]; stayQuery: string }) {
  if (rooms.length === 0) return null
  return (
    <section id="similar-rooms" aria-labelledby="similar-title" className="section-y pb-0">
      <div className="container-page">
        <TextReveal as="h2" id="similar-title" text="You may also like" staggerChildren={0.05} className="mb-8 font-display text-h2" />
        <StaggerGroup as="ul" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" staggerChildren={0.1}>
          {rooms.map((r) => (
            <StaggerItem as="li" scale key={r.id} className="h-full">
              <Tilt className="h-full">
                <RoomCard room={toFeatureRoom(r)} stayQuery={stayQuery} compact />
              </Tilt>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}

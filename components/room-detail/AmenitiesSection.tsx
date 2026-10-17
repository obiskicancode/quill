import { groupAmenities, type RoomDetail } from '@/lib/room-detail'
import { roomAmenityLabels } from '@/lib/rooms'
import { StaggerGroup } from '../motion/StaggerGroup'
import { StaggerItem } from '../motion/StaggerItem'
import { RoomAmenityIcon } from '../rooms/RoomAmenityIcon'
import { AmenitiesModal } from './AmenitiesModal'

const GRID_LIMIT = 8

export function AmenitiesSection({ room }: { room: RoomDetail }) {
  const shown = room.amenities.slice(0, GRID_LIMIT)
  const overflow = room.amenities.length > GRID_LIMIT
  return (
    <section aria-labelledby="amenities-title">
      <h2 id="amenities-title" className="font-display text-h3">What this room offers</h2>
      <StaggerGroup as="ul" className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4" staggerChildren={0.05}>
        {shown.map((key) => (
          <StaggerItem as="li" scale key={key} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/25 text-accent-ink">
              <RoomAmenityIcon name={key} className="size-5" />
            </span>
            <span className="text-small font-medium">{roomAmenityLabels[key]}</span>
          </StaggerItem>
        ))}
      </StaggerGroup>
      {overflow && (
        <div className="mt-6">
          <AmenitiesModal total={room.amenities.length} groups={groupAmenities(room.amenities)} />
        </div>
      )}
    </section>
  )
}

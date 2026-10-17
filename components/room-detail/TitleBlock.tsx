import { BedDouble, Ruler, Users } from 'lucide-react'
import type { RoomDetail } from '@/lib/room-detail'
import { Badge } from '../rooms/AvailabilityBadge'

export function TitleBlock({ room }: { room: RoomDetail }) {
  return (
    <div>
      <h1 className="font-display text-h2 text-balance md:text-display">{room.name}</h1>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-body text-ink/85">
        <li className="inline-flex items-center gap-2"><BedDouble className="size-5 text-accent-ink" aria-hidden />{room.bedConfig}</li>
        <li className="inline-flex items-center gap-2"><Ruler className="size-5 text-accent-ink" aria-hidden />{room.sizeSqm} sqm</li>
        <li className="inline-flex items-center gap-2">
          <Users className="size-5 text-accent-ink" aria-hidden />
          Up to {room.maxAdults} {room.maxAdults === 1 ? 'adult' : 'adults'} and {room.maxChildren} {room.maxChildren === 1 ? 'child' : 'children'}
        </li>
      </ul>
      {(room.breakfastIncluded || room.extraBed.available) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {room.breakfastIncluded && <Badge tone="accent">Breakfast included</Badge>}
          {room.extraBed.available && <Badge>Extra bed available</Badge>}
        </div>
      )}
    </div>
  )
}

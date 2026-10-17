import { BedDouble, MapPin, Ruler, Users } from 'lucide-react'
import type { RoomDetail } from '@/lib/room-detail'

export function KeyFacts({ room }: { room: RoomDetail }) {
  const facts = [
    { icon: BedDouble, label: 'Bed', value: room.bedConfig },
    { icon: Ruler, label: 'Size', value: `${room.sizeSqm} sqm` },
    { icon: Users, label: 'Guests', value: `Up to ${room.maxAdults + room.maxChildren}` },
    { icon: MapPin, label: 'View and floor', value: room.viewNotes },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-card border border-line bg-surface p-5 md:grid-cols-4">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label}>
          <dt className="flex items-center gap-2 text-caption font-semibold text-muted">
            <Icon className="size-4 text-accent-ink" aria-hidden />
            {label}
          </dt>
          <dd className="mt-1 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

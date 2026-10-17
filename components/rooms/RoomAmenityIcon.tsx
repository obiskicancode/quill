import { DoorOpen, Utensils } from 'lucide-react'
import { AmenityIcon } from '../AmenityIcon'
import type { AmenityKey } from '@/lib/types'
import type { RoomAmenityKey } from '@/lib/rooms'

/** Wraps the existing AmenityIcon and adds the two listing-only amenities. */
export function RoomAmenityIcon({ name, className = 'size-4' }: { name: RoomAmenityKey; className?: string }) {
  if (name === 'balcony') return <DoorOpen className={className} aria-hidden />
  if (name === 'kitchenette') return <Utensils className={className} aria-hidden />
  return <AmenityIcon name={name as AmenityKey} className={className} />
}

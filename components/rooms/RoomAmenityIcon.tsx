import { DoorOpen, Utensils } from 'lucide-react';

import type { RoomAmenityKey } from '@/lib/rooms';
import type { AmenityKey } from '@/types/site.types';

import { AmenityIcon } from '../AmenityIcon';

/** Wraps the existing AmenityIcon and adds the two listing-only amenities. */
export function RoomAmenityIcon({
  name,
  className = 'size-4',
}: {
  name: RoomAmenityKey;
  className?: string;
}) {
  if (name === 'balcony') return <DoorOpen className={className} aria-hidden />;
  if (name === 'kitchenette')
    return <Utensils className={className} aria-hidden />;
  return <AmenityIcon name={name as AmenityKey} className={className} />;
}

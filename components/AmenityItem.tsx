import type { RoomAmenityKey } from '@/types/rooms.types';

import { StaggerItem } from './motion/StaggerItem';
import { RoomAmenityIcon } from './rooms/RoomAmenityIcon';
import { IconBadge } from './ui/icon-badge';

interface AmenityItemProps {
  amenity: { key: RoomAmenityKey; label: string; description?: string };
  /** 'dark' for the dark home band, 'light' on a paper or white background. */
  tone?: 'dark' | 'light';
}

/** A single amenity row. Inherits its entrance from a parent <StaggerGroup> via <StaggerItem>; renders static when the parent skips animation. */
export function AmenityItem({ amenity, tone = 'dark' }: AmenityItemProps) {
  return (
    <StaggerItem as="li" className="flex items-center gap-4">
      <IconBadge>
        <RoomAmenityIcon name={amenity.key} />
      </IconBadge>
      <div className="min-w-0">
        <p className="font-semibold">{amenity.label}</p>
        {amenity.description && (
          <p
            className={`mt-1 text-small ${tone === 'dark' ? 'text-paper/80' : 'text-muted-foreground'}`}
          >
            {amenity.description}
          </p>
        )}
      </div>
    </StaggerItem>
  );
}

import { BedDouble, MapPin, Ruler, Users } from 'lucide-react';

import type { RoomDetail } from '@/lib/rooms';

import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';

export function KeyFacts({ room }: { room: RoomDetail }) {
  const facts = [
    { icon: BedDouble, label: 'Bed', value: room.bedConfig },
    { icon: Ruler, label: 'Size', value: `${room.sizeSqm} sqm` },
    {
      icon: Users,
      label: 'Guests',
      value: `Up to ${room.maxAdults + room.maxChildren}`,
    },
    { icon: MapPin, label: 'View and floor', value: room.viewNotes },
  ];
  return (
    <StaggerGroup
      as="dl"
      className="rounded-card border-line bg-surface grid grid-cols-2 gap-x-6 gap-y-5 border p-5 md:grid-cols-4"
      staggerChildren={0.08}
    >
      {facts.map(({ icon: Icon, label, value }) => (
        <StaggerItem as="div" key={label}>
          <dt className="text-caption text-muted flex items-center gap-2 font-semibold">
            <Icon className="text-accent-ink size-4" aria-hidden />
            {label}
          </dt>
          <dd className="mt-1 font-semibold">{value}</dd>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

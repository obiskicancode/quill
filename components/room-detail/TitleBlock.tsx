import { BedDouble, Ruler, Users } from 'lucide-react';

import type { RoomDetail } from '@/lib/rooms';

import { Reveal } from '../motion/Reveal';
import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { TextReveal } from '../motion/TextReveal';
import { Badge } from '../rooms/AvailabilityBadge';

export function TitleBlock({ room }: { room: RoomDetail }) {
  return (
    <div>
      <TextReveal
        as="h1"
        text={room.name}
        onScroll={false}
        staggerChildren={0.05}
        className="font-display text-h2 md:text-display text-balance"
      />
      <StaggerGroup
        as="ul"
        className="text-body text-ink/85 mt-4 flex flex-wrap gap-x-6 gap-y-2"
        staggerChildren={0.08}
        delayChildren={0.15}
      >
        <StaggerItem as="li" className="inline-flex items-center gap-2">
          <BedDouble className="text-accent-ink size-5" aria-hidden />
          {room.bedConfig}
        </StaggerItem>
        <StaggerItem as="li" className="inline-flex items-center gap-2">
          <Ruler className="text-accent-ink size-5" aria-hidden />
          {room.sizeSqm} sqm
        </StaggerItem>
        <StaggerItem as="li" className="inline-flex items-center gap-2">
          <Users className="text-accent-ink size-5" aria-hidden />
          Up to {room.maxAdults} {room.maxAdults === 1 ? 'adult' : 'adults'} and{' '}
          {room.maxChildren} {room.maxChildren === 1 ? 'child' : 'children'}
        </StaggerItem>
      </StaggerGroup>
      {(room.breakfastIncluded || room.extraBed.available) && (
        <Reveal delay={0.3}>
          <div className="mt-4 flex flex-wrap gap-2">
            {room.breakfastIncluded && (
              <Badge tone="accent">Breakfast included</Badge>
            )}
            {room.extraBed.available && <Badge>Extra bed available</Badge>}
          </div>
        </Reveal>
      )}
    </div>
  );
}

import { StaggerGroup, TextReveal } from '@/components/motion';
import { getRoomAmenities } from '@/lib/content/data';

import { AmenityItem } from '../AmenityItem';
import { TextLink } from '../ui/TextLink';

/** The in-room amenities most room types share, worked out from the real room data. */
export async function RoomAmenitiesSummary() {
  const items = await getRoomAmenities();
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="room-amenities-title"
      className="section-y bg-card"
    >
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <TextReveal
              as="h2"
              id="room-amenities-title"
              text="In every room"
              className="font-display text-h2"
            />
            <p className="text-body-lg text-ink/85 mt-3">
              What most of our rooms and apartments include.
            </p>
          </div>
          <TextLink href="/rooms">See all rooms</TextLink>
        </div>
        <StaggerGroup
          as="ul"
          staggerChildren={0.05}
          className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {items.map((a) => (
            <AmenityItem key={a.key} amenity={a} tone="light" />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

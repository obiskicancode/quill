import { cn } from 'cn';

import { getPublicSite } from '@/lib/content/data';
import { whatsappHref } from '@/lib/site';
import type { Room } from '@/types/site.types';

import { StaggerGroup } from '../motion/StaggerGroup';
import { StaggerItem } from '../motion/StaggerItem';
import { Tilt } from '../motion/Tilt';
import { RoomCard } from '../RoomCard';
import { SectionHeading } from '../ui/SectionHeading';
import { TextLink } from '../ui/TextLink';

export async function FeaturedRooms({ rooms }: { rooms: Room[] }) {
  const site = await getPublicSite();
  const visible = rooms.slice(0, 4);

  return (
    <section aria-labelledby="rooms-heading" className="section-y pt-0">
      <div className="container-page">
        <SectionHeading
          id="rooms-heading"
          title="Rooms and apartments"
          intro="Pick the space that suits your stay. Prices are per night."
          action={<TextLink href="/rooms">See all rooms</TextLink>}
        />
        {visible.length > 0 ? (
          <StaggerGroup
            className={cn(
              `grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${visible.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`,
            )}
            staggerChildren={0.1}
          >
            {visible.map((room) => (
              <StaggerItem key={room.id} scale className="h-full">
                <Tilt className="h-full">
                  <RoomCard room={room} />
                </Tilt>
              </StaggerItem>
            ))}
          </StaggerGroup>
        ) : (
          <div className="rounded-card border-ink/30 border border-dashed p-10 text-center">
            <p className="font-display text-h3">Our rooms are being updated.</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md">
              Message us on WhatsApp and we will tell you what is available for
              your dates.
            </p>
            <div className="mt-4">
              <TextLink href={whatsappHref(site)} external>
                Chat on WhatsApp
              </TextLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { whatsappHref } from "@/lib/site";
import type { Room } from "@/lib/types";
import { RoomCard } from "../RoomCard";
import { StaggerGroup } from "../motion/StaggerGroup";
import { StaggerItem } from "../motion/StaggerItem";
import { Tilt } from "../motion/Tilt";
import { SectionHeading } from "../ui/SectionHeading";
import { TextLink } from "../ui/TextLink";

export function FeaturedRooms({ rooms }: { rooms: Room[] }) {
  const visible = rooms.slice(0, 4);
  // Static class names so Tailwind can see them.
  const columns = visible.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";

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
            className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${columns}`}
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
          <div className="rounded-card border border-dashed border-ink/30 p-10 text-center">
            <p className="font-display text-h3">Our rooms are being updated.</p>
            <p className="mx-auto mt-2 max-w-md text-muted">
              Message us on WhatsApp and we will tell you what is available for
              your dates.
            </p>
            <div className="mt-4">
              <TextLink href={whatsappHref()} external>
                Chat on WhatsApp
              </TextLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import type { Amenity } from '@/lib/types'
import { AmenityItem } from './AmenityItem'
import { StaggerGroup } from './motion/StaggerGroup'
import { SectionHeading } from './ui/SectionHeading'
import { TextLink } from './ui/TextLink'

export function Amenities({ amenities }: { amenities: Amenity[] }) {
  const items = amenities.slice(0, 8)
  if (items.length === 0) return null
  return (
    <section aria-labelledby="amenities-heading" className="on-dark section-y bg-ink text-paper">
      <div className="container-page">
        <SectionHeading
          id="amenities-heading"
          title="Everything you need for the stay"
          intro="The practical things, done properly."
          action={<TextLink href="/amenities">See all amenities</TextLink>}
        />
        <StaggerGroup
          as="ul"
          className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
          staggerChildren={0.07}
        >
          {items.map((amenity) => (
            <AmenityItem key={amenity.key} amenity={amenity} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}

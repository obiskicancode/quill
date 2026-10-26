import { getGalleryImages, getRoomTypeOptions } from '@/lib/content/data';
import {
  GALLERY_CATEGORIES,
  type GalleryCategory,
} from '@/types/content.types';

import { Reveal } from '../motion/Reveal';
import { EmptyState } from '../rooms/EmptyState';
import { ButtonLink } from '../ui/Button';
import { GalleryBrowser } from './GalleryBrowser';

interface GallerySectionProps {
  category: string | null;
  room: string | null;
  image: string | null;
}

/** Server part of the gallery: loads the photos, then hands them to the interactive browser. */
export async function GallerySection({
  category,
  room,
  image,
}: GallerySectionProps) {
  const images = await getGalleryImages();

  if (images.length === 0) {
    return (
      <section aria-labelledby="gallery-empty" className="section-y">
        <div className="container-page">
          <h2 id="gallery-empty" className="sr-only">
            Photos
          </h2>
          <EmptyState
            title="Our photos are on the way"
            text="We are putting the gallery together. In the meantime, see our rooms or message us and we will send pictures."
            action={<ButtonLink href="/rooms">See our rooms</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  const valid = (GALLERY_CATEGORIES as readonly string[]).includes(
    category ?? '',
  )
    ? (category as GalleryCategory)
    : 'all';
  const hasCategory =
    valid === 'all' || images.some((i) => i.category === valid);
  // A shared ?image= link may point at a photo outside the chosen category: open it from "All" instead.
  const target = image ? images.find((i) => i.id === image) : null;
  const startCategory = !hasCategory
    ? 'all'
    : target && valid !== 'all' && target.category !== valid
      ? 'all'
      : valid;

  return (
    <section
      aria-labelledby="gallery-title"
      className="section-y pt-8 md:pt-10"
    >
      <div className="container-page">
        <h2 id="gallery-title" className="sr-only">
          Photo gallery
        </h2>
        <GalleryBrowser
          images={images}
          roomTypes={await getRoomTypeOptions()}
          initial={{
            category: startCategory,
            room: startCategory === 'rooms' ? room : null,
            imageId: target?.id ?? null,
          }}
        />
        <Reveal>
          <div className="rounded-card bg-surface shadow-raised mt-16 flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="font-display text-h3">Like what you see?</p>
              <p className="text-ink/85 mt-2">
                Look at the rooms in detail, then book direct.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/rooms" size="lg">
                See rooms and book
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

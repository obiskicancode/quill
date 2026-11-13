'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { TextLink } from '@/components/ui/text-link';
import { cn } from '@/lib/utils';

import { EASE_OUT, viewportOnce } from './motion/variants';
import { Photo } from './ui/Photo';
import { SectionHeading } from './ui/SectionHeading';

interface Tile {
  src: string;
  alt: string;
  /** Where the photo opens. A tile with no destination renders as a plain image. */
  href?: string;
  blurDataURL?: string | null;
  placeholderColor?: string | null;
}

/**
 * Spans for a four-column dense grid, listed per tile count. Each set packs
 * whole rows — 4 and 5 tiles fill two rows, six fill three — so a preview that
 * is one photo short still reads as a mosaic instead of a ragged strip.
 */
const MOSAIC: Record<number, string[]> = {
  4: ['col-span-2 row-span-2', '', 'col-span-2', ''],
  5: ['col-span-2 row-span-2', '', '', '', ''],
  6: [
    'col-span-2 row-span-2',
    '',
    'row-span-2',
    '',
    'col-span-2',
    'col-span-2',
  ],
};

/** Masonry-style gallery grid with lazy images and lightbox entry points. */
export function GalleryGrid({ images }: { images: Tile[] }) {
  const reduced = useReducedMotion();
  const tiles = images.slice(0, 6);
  if (tiles.length === 0) return null;
  const spans = MOSAIC[tiles.length];
  const mosaic = spans !== undefined;

  return (
    <section aria-labelledby="gallery-heading" className="section-y">
      <div className="container-page">
        <SectionHeading
          id="gallery-heading"
          title="A look around"
          action={<TextLink href="/gallery">View full gallery</TextLink>}
        />
        <div
          className={cn(
            'grid grid-flow-dense grid-cols-2 gap-3 md:gap-4',
            mosaic
              ? 'auto-rows-[9.5rem] md:auto-rows-[13rem] md:grid-cols-4'
              : 'md:grid-cols-3',
          )}
        >
          {tiles.map((tile, i) => {
            const span = mosaic ? spans[i] : '';
            const large = span?.includes('col-span-2') ?? false;
            const photo = (
              <Photo
                src={tile.src}
                alt={tile.alt}
                sizes={
                  large
                    ? '(min-width: 768px) 50vw, 100vw'
                    : '(min-width: 768px) 25vw, 50vw'
                }
                blurDataURL={tile.blurDataURL}
                placeholderColor={tile.placeholderColor}
                className={cn(
                  'w-full rounded-card transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]',
                  mosaic ? 'h-full' : 'aspect-[4/3]',
                )}
              />
            );
            return (
              <motion.div
                key={`${i}-${tile.src}`}
                className={cn('group', span)}
                initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
                viewport={viewportOnce}
                transition={{
                  duration: 0.7,
                  ease: EASE_OUT,
                  delay: reduced
                    ? 0
                    : Math.abs(i - (tiles.length - 1) / 2) * 0.06,
                }}
              >
                {tile.href ? (
                  <Link
                    href={tile.href}
                    aria-label={`${tile.alt}. Open in the full gallery`}
                    className={mosaic ? 'block h-full' : 'block'}
                  >
                    {photo}
                  </Link>
                ) : (
                  photo
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

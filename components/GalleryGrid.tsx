'use client';

import { motion, useReducedMotion } from 'framer-motion';

import type { ImageAsset } from '@/types/site.types';

import { EASE_OUT, viewportOnce } from './motion/variants';
import { Photo } from './ui/Photo';
import { SectionHeading } from './ui/SectionHeading';
import { TextLink } from './ui/TextLink';

// Spans for six tiles: one large, one tall, two wide, two single. Row heights are fixed, so there is no layout shift.
const SPANS = [
  'col-span-2 row-span-2',
  '',
  'row-span-2',
  '',
  'col-span-2',
  'col-span-2',
];

// Delay per tile so the mosaic assembles from the centre outward, not left to right.
const DELAYS = [0.12, 0.04, 0.2, 0, 0.16, 0.24];

export function GalleryGrid({ images }: { images: ImageAsset[] }) {
  const reduced = useReducedMotion();
  const tiles = images.slice(0, 6);
  if (tiles.length === 0) return null;
  const asymmetric = tiles.length === 6;

  return (
    <section aria-labelledby="gallery-heading" className="section-y">
      <div className="container-page">
        <SectionHeading
          id="gallery-heading"
          title="A look around"
          action={<TextLink href="/gallery">View full gallery</TextLink>}
        />
        <div
          className={`grid grid-flow-dense grid-cols-2 gap-3 md:gap-4 ${
            asymmetric
              ? 'auto-rows-[9.5rem] md:auto-rows-[13rem] md:grid-cols-4'
              : 'md:grid-cols-3'
          }`}
        >
          {tiles.map((img, i) => {
            const span = asymmetric ? SPANS[i] : '';
            const large = span.includes('col-span-2');
            return (
              <motion.div
                key={img.src}
                className={`group ${span}`}
                initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
                viewport={viewportOnce}
                transition={{
                  duration: 0.7,
                  ease: EASE_OUT,
                  delay: reduced ? 0 : (DELAYS[i] ?? i * 0.06),
                }}
              >
                <Photo
                  src={img.src}
                  alt={img.alt}
                  sizes={
                    large
                      ? '(min-width: 768px) 50vw, 100vw'
                      : '(min-width: 768px) 25vw, 50vw'
                  }
                  className={`rounded-card w-full transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04] ${
                    asymmetric ? 'h-full' : 'aspect-[4/3]'
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Expand } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { GALLERY_CATEGORIES } from '@/constants/content';
import type {
  GalleryCategory,
  GalleryImageRecord,
} from '@/types/content.types';

import { HoverZoom } from '../motion/HoverZoom';
import { EASE_OUT, spring } from '../motion/variants';
import { Lightbox } from '../room-detail/Lightbox';
import { Button } from '../ui/button';
import { Photo } from '../ui/Photo';

const PAGE_SIZE = 24;
const labels: Record<GalleryCategory | 'all', string> = {
  all: 'All',
  rooms: 'Rooms',
  facilities: 'Facilities',
  exterior: 'Exterior',
  dining: 'Dining',
  events: 'Events',
  surroundings: 'Surroundings',
};

export interface GalleryInitial {
  category: GalleryCategory | 'all';
  room: string | null;
  imageId: string | null;
}

interface GalleryBrowserProps {
  images: GalleryImageRecord[];
  roomTypes: { id: string; name: string }[];
  initial: GalleryInitial;
}

/** Filter chip with a shared pill that slides between the active options. */
function Chip({
  active,
  onClick,
  pillId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  pillId: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const showPill = active && !reduced;
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className="relative rounded-full"
    >
      {showPill && (
        <motion.span
          layoutId={pillId}
          className="absolute inset-0 rounded-full bg-primary"
          transition={spring}
        />
      )}
      {active && reduced && (
        <span className="absolute inset-0 rounded-full bg-primary" />
      )}
      <span className="relative">{children}</span>
    </Button>
  );
}

/**
 * Category tabs (only those with photos), a room-type filter under Rooms, a masonry grid with each photo's ratio reserved,
 * "Load more" (24 at a time, no infinite scroll) and a lightbox. The category, room and open photo live in the URL.
 */
export function GalleryBrowser({
  images,
  roomTypes,
  initial,
}: GalleryBrowserProps) {
  const [category, setCategory] = useState<GalleryCategory | 'all'>(
    initial.category,
  );
  const [room, setRoom] = useState<string | null>(initial.room);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();

  const categories = useMemo(
    () =>
      GALLERY_CATEGORIES.filter((c) => images.some((i) => i.category === c)),
    [images],
  );
  const roomOptions = useMemo(
    () =>
      roomTypes.filter((r) =>
        images.some((i) => i.category === 'rooms' && i.roomTypeId === r.id),
      ),
    [images, roomTypes],
  );
  const filtered = useMemo(
    () =>
      images.filter(
        (i) =>
          (category === 'all' || i.category === category) &&
          (category !== 'rooms' || !room || i.roomTypeId === room),
      ),
    [images, category, room],
  );

  const startFromUrl = initial.imageId
    ? filtered.findIndex((i) => i.id === initial.imageId)
    : -1;
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: startFromUrl >= 0,
    index: Math.max(0, startFromUrl),
  });

  const syncUrl = useCallback(
    (next: {
      category: GalleryCategory | 'all';
      room: string | null;
      image: string | null;
    }) => {
      const p = new URLSearchParams(window.location.search);
      for (const k of ['category', 'room', 'image']) p.delete(k);
      if (next.category !== 'all') p.set('category', next.category);
      if (next.category === 'rooms' && next.room) p.set('room', next.room);
      if (next.image) p.set('image', next.image);
      const qs = p.toString();
      window.history.replaceState(
        null,
        '',
        qs ? `?${qs}` : window.location.pathname,
      );
    },
    [],
  );

  function pick(next: GalleryCategory | 'all') {
    setCategory(next);
    setRoom(null);
    setVisible(PAGE_SIZE);
    syncUrl({ category: next, room: null, image: null });
  }

  function pickRoom(id: string | null) {
    setRoom(id);
    setVisible(PAGE_SIZE);
    syncUrl({ category, room: id, image: null });
  }

  function loadMore() {
    const firstNew = visible;
    setVisible((v) => v + PAGE_SIZE);
    // Keep keyboard focus where the new photos start, so the footer is never the next stop.
    window.setTimeout(
      () =>
        gridRef.current
          ?.querySelector<HTMLElement>(`[data-index="${firstNew}"] button`)
          ?.focus(),
      0,
    );
  }

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  return (
    <div>
      <nav aria-label="Gallery categories">
        <ul className="flex flex-wrap gap-2">
          {(['all', ...categories] as (GalleryCategory | 'all')[]).map((c) => (
            <li key={c}>
              <Chip
                active={category === c}
                onClick={() => pick(c)}
                pillId="gallery-category-pill"
              >
                {labels[c]}
              </Chip>
            </li>
          ))}
        </ul>
      </nav>

      {category === 'rooms' && roomOptions.length > 1 && (
        <nav aria-label="Filter by room type" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Chip
                active={room === null}
                onClick={() => pickRoom(null)}
                pillId="gallery-room-pill"
              >
                All rooms
              </Chip>
            </li>
            {roomOptions.map((r) => (
              <li key={r.id}>
                <Chip
                  active={room === r.id}
                  onClick={() => pickRoom(r.id)}
                  pillId="gallery-room-pill"
                >
                  {r.name}
                </Chip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p
        role="status"
        aria-live="polite"
        className="mt-6 text-small text-muted-foreground"
      >
        Showing {shown.length} of {filtered.length}{' '}
        {filtered.length === 1 ? 'photo' : 'photos'}
        {category !== 'all' ? ` in ${labels[category]}` : ''}.
      </p>

      {/* Keyed on the active filters: a new selection fades the grid back in while the tiles reveal in view. */}
      <motion.div
        key={`${category}|${room}`}
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <ul
          ref={gridRef}
          className="mt-4 columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4"
        >
          {shown.map((img, i) => (
            <motion.li
              key={img.id}
              data-index={i}
              className="mb-3 break-inside-avoid md:mb-4"
              initial={reduced ? false : { opacity: 0, y: 18, scale: 0.98 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-6% 0px -6% 0px' }}
              transition={{
                duration: 0.55,
                ease: EASE_OUT,
                delay: Math.min(i % PAGE_SIZE, 8) * 0.035,
              }}
            >
              <Button
                variant="ghost"
                aria-label={`Open photo: ${img.altText}`}
                onClick={(e) => {
                  setTriggerEl(e.currentTarget);
                  setLightbox({ open: true, index: i });
                  syncUrl({ category, room, image: img.id });
                }}
                className="group/media block h-auto w-full overflow-hidden rounded-card p-0 hover:bg-transparent"
              >
                <HoverZoom
                  className="rounded-card"
                  caption={img.caption}
                  affordance={
                    <span className="grid size-9 place-items-center rounded-full bg-ink/60 backdrop-blur">
                      <Expand className="size-4" aria-hidden />
                    </span>
                  }
                >
                  <div style={{ aspectRatio: `${img.width} / ${img.height}` }}>
                    <Photo
                      src={img.thumbnailUrl}
                      alt={img.altText}
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      eager={i < 4}
                      blurDataURL={img.blurDataURL}
                      placeholderColor={img.color}
                      className="h-full w-full"
                    />
                  </div>
                </HoverZoom>
              </Button>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {remaining > 0 && (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" size="lg" onClick={loadMore}>
            Load more ({remaining} more)
          </Button>
        </div>
      )}

      <Lightbox
        roomName="Gallery"
        images={filtered.map((i) => ({
          src: i.url,
          alt: i.altText,
          caption: i.caption,
        }))}
        open={lightbox.open}
        startIndex={lightbox.index}
        counter="of"
        preloadNext
        returnFocusTo={triggerEl}
        onIndexChange={(i) =>
          lightbox.open &&
          syncUrl({ category, room, image: filtered[i]?.id ?? null })
        }
        onClose={() => {
          setLightbox((l) => ({ ...l, open: false }));
          syncUrl({ category, room, image: null });
        }}
      />
    </div>
  );
}

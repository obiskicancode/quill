'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Images } from 'lucide-react'
import { useRef, useState } from 'react'
import type { GalleryImage } from '@/lib/room-detail'
import { Carousel } from '../Carousel'
import { HoverZoom } from '../motion/HoverZoom'
import { Magnetic } from '../motion/Magnetic'
import { EASE_OUT } from '../motion/variants'
import { LazyPhoto } from '../rooms/LazyPhoto'
import { Photo } from '../ui/Photo'
import { Lightbox } from './Lightbox'

// The first image is the LCP. Both layouts use the same `sizes`, so the browser preloads a single file.
const HERO_SIZES = '(min-width: 1024px) 60vw, 100vw'
const SMALL_SIZES = '(min-width: 1024px) 15vw, 50vw'

// Desktop layouts: one large tile plus up to four small ones, adapted to how many photos exist.
const LAYOUTS: Record<number, { grid: string; spans: string[] }> = {
  1: { grid: 'grid-cols-1 aspect-[16/9]', spans: [''] },
  2: { grid: 'grid-cols-2 aspect-[2/1]', spans: ['', ''] },
  3: { grid: 'grid-cols-4 grid-rows-2 aspect-[2/1]', spans: ['col-span-2 row-span-2', 'col-span-2', 'col-span-2'] },
  4: { grid: 'grid-cols-4 grid-rows-2 aspect-[2/1]', spans: ['col-span-2 row-span-2', 'col-span-2', '', ''] },
  5: { grid: 'grid-cols-4 grid-rows-2 aspect-[2/1]', spans: ['col-span-2 row-span-2', '', '', '', ''] },
}

export function RoomGallery({ roomName, images }: { roomName: string; images: GalleryImage[] }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(0)
  const trigger = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()
  const count = images.length
  if (count === 0) return null

  const layout = LAYOUTS[Math.min(count, 5)]
  const tiles = images.slice(0, 5)
  const openAt = (i: number, el: HTMLElement) => {
    trigger.current = el
    setStart(i)
    setOpen(true)
  }
  const viewAll = (
    <button
      type="button"
      onClick={(e) => openAt(0, e.currentTarget)}
      className="inline-flex min-h-11 items-center gap-2 rounded-control bg-surface px-4 text-small font-semibold shadow-raised transition-colors hover:bg-paper"
    >
      <Images className="size-4" aria-hidden />
      View all {count} {count === 1 ? 'photo' : 'photos'}
    </button>
  )

  return (
    <div>
      {/* Desktop: 1 large + up to 4 small */}
      <div className="relative hidden md:block">
        <div className={`grid gap-2 overflow-hidden rounded-card ${layout.grid}`}>
          {tiles.map((img, i) => (
            <motion.div
              key={img.src}
              className={layout.spans[i]}
              initial={reduced || i === 0 ? false : { opacity: 0, scale: 0.97 }}
              animate={reduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.07 }}
            >
              <button
                type="button"
                aria-label={`Open photo ${i + 1} of ${count}: ${img.caption}`}
                onClick={(e) => openAt(i, e.currentTarget)}
                className="group/media block h-full w-full"
              >
                <HoverZoom className="h-full w-full">
                  <Photo src={img.src} alt={img.alt} sizes={i === 0 ? HERO_SIZES : SMALL_SIZES} priority={i === 0} className="h-full w-full" />
                </HoverZoom>
              </button>
            </motion.div>
          ))}
        </div>
        {count > 1 && <div className="absolute bottom-4 right-4"><Magnetic>{viewAll}</Magnetic></div>}
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="relative md:hidden">
        <div className="overflow-hidden rounded-card">
          <Carousel
            label={`${roomName} photos`}
            slides={images.map((img, i) => (
              <button key={img.src} type="button" aria-label={`Open photo ${i + 1} of ${count}: ${img.caption}`} onClick={(e) => openAt(i, e.currentTarget)} className="block w-full">
                {i === 0 ? <Photo src={img.src} alt={img.alt} sizes={HERO_SIZES} priority className="aspect-[4/3] w-full" /> : <LazyPhoto src={img.src} alt={img.alt} sizes={HERO_SIZES} />}
              </button>
            ))}
          />
        </div>
        {count > 1 && <div className="absolute right-3 top-3 z-10">{viewAll}</div>}
      </div>

      <Lightbox roomName={roomName} images={images} open={open} startIndex={start} onClose={() => setOpen(false)} returnFocusTo={trigger.current} />
    </div>
  )
}

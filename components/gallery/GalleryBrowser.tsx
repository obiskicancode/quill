'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { GALLERY_CATEGORIES, type GalleryCategory, type GalleryImageRecord } from '@/lib/content/types'
import { Lightbox } from '../room-detail/Lightbox'
import { Button } from '../ui/Button'
import { Photo } from '../ui/Photo'

const PAGE_SIZE = 24
const labels: Record<GalleryCategory | 'all', string> = {
  all: 'All', rooms: 'Rooms', facilities: 'Facilities', exterior: 'Exterior', dining: 'Dining', events: 'Events', surroundings: 'Surroundings',
}

export interface GalleryInitial {
  category: GalleryCategory | 'all'
  room: string | null
  imageId: string | null
}

interface GalleryBrowserProps {
  images: GalleryImageRecord[]
  roomTypes: { id: string; name: string }[]
  initial: GalleryInitial
}

/**
 * Category tabs (only those with photos), a room-type filter under Rooms, a masonry grid with each photo's ratio reserved,
 * "Load more" (24 at a time, no infinite scroll) and a lightbox. The category, room and open photo live in the URL.
 */
export function GalleryBrowser({ images, roomTypes, initial }: GalleryBrowserProps) {
  const [category, setCategory] = useState<GalleryCategory | 'all'>(initial.category)
  const [room, setRoom] = useState<string | null>(initial.room)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const trigger = useRef<HTMLElement | null>(null)
  const gridRef = useRef<HTMLUListElement>(null)

  const categories = useMemo(() => GALLERY_CATEGORIES.filter((c) => images.some((i) => i.category === c)), [images])
  const roomOptions = useMemo(
    () => roomTypes.filter((r) => images.some((i) => i.category === 'rooms' && i.roomTypeId === r.id)),
    [images, roomTypes],
  )
  const filtered = useMemo(
    () => images.filter((i) => (category === 'all' || i.category === category) && (category !== 'rooms' || !room || i.roomTypeId === room)),
    [images, category, room],
  )

  const startFromUrl = initial.imageId ? filtered.findIndex((i) => i.id === initial.imageId) : -1
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: startFromUrl >= 0, index: Math.max(0, startFromUrl) })

  const syncUrl = useCallback((next: { category: GalleryCategory | 'all'; room: string | null; image: string | null }) => {
    const p = new URLSearchParams(window.location.search)
    for (const k of ['category', 'room', 'image']) p.delete(k)
    if (next.category !== 'all') p.set('category', next.category)
    if (next.category === 'rooms' && next.room) p.set('room', next.room)
    if (next.image) p.set('image', next.image)
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [])

  function pick(next: GalleryCategory | 'all') {
    setCategory(next)
    setRoom(null)
    setVisible(PAGE_SIZE)
    syncUrl({ category: next, room: null, image: null })
  }

  function pickRoom(id: string | null) {
    setRoom(id)
    setVisible(PAGE_SIZE)
    syncUrl({ category, room: id, image: null })
  }

  function loadMore() {
    const firstNew = visible
    setVisible((v) => v + PAGE_SIZE)
    // Keep keyboard focus where the new photos start, so the footer is never the next stop.
    window.setTimeout(() => gridRef.current?.querySelector<HTMLElement>(`[data-index="${firstNew}"] button`)?.focus(), 0)
  }

  const shown = filtered.slice(0, visible)
  const remaining = filtered.length - shown.length
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-small font-semibold transition-colors ${active ? 'border-ink bg-ink text-paper' : 'border-ink/50 bg-surface hover:bg-ink hover:text-paper'}`

  return (
    <div>
      <nav aria-label="Gallery categories">
        <ul className="flex flex-wrap gap-2">
          {(['all', ...categories] as (GalleryCategory | 'all')[]).map((c) => (
            <li key={c}>
              <button type="button" aria-pressed={category === c} onClick={() => pick(c)} className={chip(category === c)}>{labels[c]}</button>
            </li>
          ))}
        </ul>
      </nav>

      {category === 'rooms' && roomOptions.length > 1 && (
        <nav aria-label="Filter by room type" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            <li><button type="button" aria-pressed={room === null} onClick={() => pickRoom(null)} className={chip(room === null)}>All rooms</button></li>
            {roomOptions.map((r) => (
              <li key={r.id}><button type="button" aria-pressed={room === r.id} onClick={() => pickRoom(r.id)} className={chip(room === r.id)}>{r.name}</button></li>
            ))}
          </ul>
        </nav>
      )}

      <p role="status" aria-live="polite" className="mt-6 text-small text-muted">
        Showing {shown.length} of {filtered.length} {filtered.length === 1 ? 'photo' : 'photos'}{category !== 'all' ? ` in ${labels[category]}` : ''}.
      </p>

      <ul ref={gridRef} className="mt-4 columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
        {shown.map((img, i) => (
          <li key={img.id} data-index={i} className="mb-3 break-inside-avoid md:mb-4">
            <button
              type="button"
              aria-label={`Open photo: ${img.altText}`}
              onClick={(e) => {
                trigger.current = e.currentTarget
                setLightbox({ open: true, index: i })
                syncUrl({ category, room, image: img.id })
              }}
              className="block w-full overflow-hidden rounded-card transition-[filter] hover:brightness-90"
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
            </button>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" size="lg" onClick={loadMore}>Load more ({remaining} more)</Button>
        </div>
      )}

      <Lightbox
        roomName="Gallery"
        images={filtered.map((i) => ({ src: i.url, alt: i.altText, caption: i.caption }))}
        open={lightbox.open}
        startIndex={lightbox.index}
        counter="of"
        preloadNext
        returnFocusTo={trigger.current}
        onIndexChange={(i) => lightbox.open && syncUrl({ category, room, image: filtered[i]?.id ?? null })}
        onClose={() => {
          setLightbox((l) => ({ ...l, open: false }))
          syncUrl({ category, room, image: null })
        }}
      />
    </div>
  )
}

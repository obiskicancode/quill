'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { RoomGalleryImage } from '@/types/rooms.types';

interface LightboxProps {
  roomName: string;
  images: RoomGalleryImage[];
  open: boolean;
  startIndex: number;
  onClose: () => void;
  /** The button that opened the viewer. Focus goes back to it on close. */
  returnFocusTo: HTMLElement | null;
  /** Called whenever the visible photo changes (the gallery keeps ?image= in step). */
  onIndexChange?: (index: number) => void;
  /** "slash" shows 4 / 24; "of" shows 4 of 24. */
  counter?: 'slash' | 'of';
  /** Only mount the current photo and the next one (instead of both neighbours). */
  preloadNext?: boolean;
}

/**
 * Full-screen photo viewer on a native modal <dialog>: focus is trapped, Esc closes, and the page behind is inert.
 * Swipe (scroll-snap), arrow keys and buttons move between photos. Never auto-advances.
 */
export function Lightbox({
  roomName,
  images,
  open,
  startIndex,
  onClose,
  returnFocusTo,
  onIndexChange,
  counter = 'slash',
  preloadNext = false,
}: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const count = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setIndex(startIndex);
      requestAnimationFrame(() =>
        trackRef.current?.scrollTo({
          left: startIndex * (trackRef.current?.clientWidth ?? 0),
          behavior: 'auto',
        }),
      );
    }
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, startIndex]);

  useEffect(() => {
    if (open) onIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, open]);

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = Math.max(0, Math.min(count - 1, next));
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      track.scrollTo({
        left: target * track.clientWidth,
        behavior: reduce ? 'auto' : 'smooth',
      });
    },
    [count],
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="lightbox-title"
      onClose={() => {
        onClose();
        returnFocusTo?.focus();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') goTo(index - 1);
        if (e.key === 'ArrowRight') goTo(index + 1);
      }}
      className="on-dark bg-ink backdrop:bg-ink m-0 h-dvh max-h-none w-screen max-w-none p-0 text-white open:flex open:flex-col"
    >
      {open && (
        <div className="animate-overlay-zoom flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-2 md:px-6">
            <h2 id="lightbox-title" className="sr-only">
              {roomName} photos
            </h2>
            <p aria-live="polite" className="text-small tabular-nums">
              {counter === 'of'
                ? `${index + 1} of ${count}`
                : `${index + 1} / ${count}`}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close photo viewer"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full text-white hover:bg-white/15 hover:text-white"
            >
              <X className="size-6" aria-hidden />
            </Button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={trackRef}
              onScroll={() => {
                const t = trackRef.current;
                if (t) setIndex(Math.round(t.scrollLeft / t.clientWidth));
              }}
              className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
            >
              {images.map((img, i) => (
                <figure
                  key={img.src}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  className="flex h-full w-full shrink-0 snap-center flex-col"
                >
                  <div className="relative min-h-0 flex-1">
                    {(preloadNext
                      ? i === index || i === index + 1
                      : Math.abs(i - index) <= 1) && (
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="100vw"
                        className="object-contain"
                      />
                    )}
                  </div>
                  <figcaption className="text-small min-h-14 px-5 py-3 text-center text-white/90">
                    {img.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
            {count > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous photo"
                  disabled={index === 0}
                  onClick={() => goTo(index - 1)}
                  className="bg-ink/70 hover:bg-ink absolute top-1/2 left-3 hidden size-12 -translate-y-1/2 rounded-full text-white hover:text-white disabled:opacity-30 md:inline-flex"
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Next photo"
                  disabled={index === count - 1}
                  onClick={() => goTo(index + 1)}
                  className="bg-ink/70 hover:bg-ink absolute top-1/2 right-3 hidden size-12 -translate-y-1/2 rounded-full text-white hover:text-white disabled:opacity-30 md:inline-flex"
                >
                  <ChevronRight className="size-6" aria-hidden />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

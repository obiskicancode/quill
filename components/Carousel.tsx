'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Button } from './ui/button';

interface CarouselProps {
  label: string;
  slides: ReactNode[];
  /** Noun used for the status and control labels — "photo" gives "Photo 2 of 8" and "Previous photo". Defaults to the item number alone. */
  itemNoun?: string;
  /** Auto-advance interval. Only runs with a mouse, with motion allowed, and while not hovered, focused or paused. */
  autoplayMs?: number;
  controls?: 'overlay' | 'below';
  slideClassName?: string;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Native scroll-snap carousel (swipe works on touch). Previous/next buttons and optional pause,
 * never auto-advances on touch devices or with reduced motion. Arrow keys move the active slide;
 * a role="status" region announces "Photo 2 of 8" so screen readers are not spammed on every scroll.
 */
export function Carousel({
  label,
  slides,
  itemNoun,
  autoplayMs,
  controls = 'overlay',
  slideClassName = '',
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (!autoplayMs) return;
    const motionOk = window.matchMedia(
      '(prefers-reduced-motion: no-preference)',
    );
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanAutoplay(motionOk.matches && mouse.matches);
    update();
    motionOk.addEventListener('change', update);
    mouse.addEventListener('change', update);
    return () => {
      motionOk.removeEventListener('change', update);
      mouse.removeEventListener('change', update);
    };
  }, [autoplayMs]);

  const goTo = useCallback(
    (next: number) => {
      const el = trackRef.current;
      if (!el) return;
      const target = Math.max(0, Math.min(count - 1, next));
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      el.scrollTo({
        left: target * el.clientWidth,
        behavior: reduce ? 'auto' : 'smooth',
      });
    },
    [count],
  );

  const playing = Boolean(autoplayMs) && canAutoplay && !userPaused;
  useEffect(() => {
    if (!playing || interacting || count < 2) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      goTo(current >= count - 1 ? 0 : current + 1);
    }, autoplayMs);
    return () => window.clearInterval(id);
  }, [playing, interacting, count, autoplayMs, goTo]);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  const prevDisabled = index <= 0;
  const nextDisabled = index >= count - 1;
  const prevLabel = itemNoun ? `Previous ${itemNoun}` : 'Previous';
  const nextLabel = itemNoun ? `Next ${itemNoun}` : 'Next';
  const status = itemNoun
    ? `${capitalise(itemNoun)} ${index + 1} of ${count}`
    : `${index + 1} of ${count}`;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className={`w-full shrink-0 snap-center ${slideClassName}`}
          >
            {slide}
          </div>
        ))}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {count > 1 && controls === 'overlay' && (
        <>
          <Button
            variant="secondary"
            size="icon"
            aria-label={prevLabel}
            disabled={prevDisabled}
            onClick={() => goTo(index - 1)}
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full shadow-raised disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={nextLabel}
            disabled={nextDisabled}
            onClick={() => goTo(index + 1)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full shadow-raised disabled:opacity-40"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((_, i) => {
              const isActive = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={
                    itemNoun
                      ? `Go to ${itemNoun} ${i + 1}`
                      : `Go to slide ${i + 1}`
                  }
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => goTo(i)}
                  className={`size-2 rounded-full shadow-[0_0_0_0.0625rem_rgb(0_0_0/0.25)] transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white ${
                    isActive ? 'bg-white' : 'bg-white/55'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}

      {count > 1 && controls === 'below' && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            aria-label={prevLabel}
            disabled={prevDisabled}
            onClick={() => goTo(index - 1)}
            className="rounded-full shadow-raised"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          {autoplayMs && canAutoplay && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={
                userPaused
                  ? 'Play automatic slide show'
                  : 'Pause automatic slide show'
              }
              onClick={() => setUserPaused((p) => !p)}
              className="rounded-full shadow-raised"
            >
              {userPaused ? (
                <Play className="size-5" aria-hidden />
              ) : (
                <Pause className="size-5" aria-hidden />
              )}
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            aria-label={nextLabel}
            disabled={nextDisabled}
            onClick={() => goTo(index + 1)}
            className="rounded-full shadow-raised"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Button>
          <p
            aria-hidden
            className="ml-2 min-w-12 text-small text-muted-foreground tabular-nums"
          >
            {index + 1} / {count}
          </p>
        </div>
      )}
    </div>
  );
}

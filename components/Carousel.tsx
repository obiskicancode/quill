'use client'

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface CarouselProps {
  label: string
  slides: ReactNode[]
  /** Auto-advance interval. Only runs with a mouse, with motion allowed, and while not hovered, focused or paused. */
  autoplayMs?: number
  controls?: 'overlay' | 'below'
  slideClassName?: string
}

/**
 * Native scroll-snap carousel (swipe works on touch). Previous/next buttons, optional pause,
 * never auto-advances on touch devices or with reduced motion.
 */
export function Carousel({ label, slides, autoplayMs, controls = 'overlay', slideClassName = '' }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [canAutoplay, setCanAutoplay] = useState(false)
  const count = slides.length

  useEffect(() => {
    if (!autoplayMs) return
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setCanAutoplay(motionOk.matches && mouse.matches)
    update()
    motionOk.addEventListener('change', update)
    mouse.addEventListener('change', update)
    return () => {
      motionOk.removeEventListener('change', update)
      mouse.removeEventListener('change', update)
    }
  }, [autoplayMs])

  const goTo = useCallback(
    (next: number) => {
      const el = trackRef.current
      if (!el) return
      const target = Math.max(0, Math.min(count - 1, next))
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollTo({ left: target * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
    },
    [count],
  )

  const playing = Boolean(autoplayMs) && canAutoplay && !userPaused
  useEffect(() => {
    if (!playing || interacting || count < 2) return
    const id = window.setInterval(() => {
      const el = trackRef.current
      if (!el) return
      const current = Math.round(el.scrollLeft / el.clientWidth)
      goTo(current >= count - 1 ? 0 : current + 1)
    }, autoplayMs)
    return () => window.clearInterval(id)
  }, [playing, interacting, count, autoplayMs, goTo])

  const onScroll = () => {
    const el = trackRef.current
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const prevDisabled = index <= 0
  const nextDisabled = index >= count - 1
  const arrow =
    'grid size-11 place-items-center rounded-full bg-surface text-ink shadow-raised transition-[background-color,opacity,transform] hover:bg-paper active:scale-95 disabled:opacity-40 disabled:hover:bg-surface'

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="relative"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        aria-live={playing && !interacting ? 'off' : 'polite'}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      {count > 1 && controls === 'overlay' && (
        <>
          <button type="button" aria-label="Previous photo" disabled={prevDisabled} onClick={() => goTo(index - 1)} className={`${arrow} absolute left-3 top-1/2 -translate-y-1/2`}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Next photo" disabled={nextDisabled} onClick={() => goTo(index + 1)} className={`${arrow} absolute right-3 top-1/2 -translate-y-1/2`}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`size-2 rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.25)] ${i === index ? 'bg-white' : 'bg-white/55'}`} />
            ))}
          </div>
        </>
      )}

      {count > 1 && controls === 'below' && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button type="button" aria-label="Previous review" disabled={prevDisabled} onClick={() => goTo(index - 1)} className={`${arrow} border border-line`}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          {autoplayMs && canAutoplay && (
            <button
              type="button"
              aria-label={userPaused ? 'Play automatic slide show' : 'Pause automatic slide show'}
              onClick={() => setUserPaused((p) => !p)}
              className={`${arrow} border border-line`}
            >
              {userPaused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
            </button>
          )}
          <button type="button" aria-label="Next review" disabled={nextDisabled} onClick={() => goTo(index + 1)} className={`${arrow} border border-line`}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <p aria-hidden className="ml-2 min-w-12 text-small tabular-nums text-muted">
            {index + 1} / {count}
          </p>
        </div>
      )}
    </div>
  )
}

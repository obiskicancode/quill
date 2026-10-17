'use client'

import { Clock, MapPin, Navigation, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { directionsHref, mapEmbedSrc, site, telHref } from '@/lib/site'
import { Button, ButtonLink } from './ui/Button'
import { Photo } from './ui/Photo'

export interface MapCardData {
  addressLines: string[]
  reception: string | null
  landmarks: { name: string; distance: string }[]
  telHref: string
  phoneDisplay?: string
  /** The iframe address. When null the map is replaced by the static fallback. */
  embedSrc: string | null
  directionsHref: string | null
  /** A plain link to the address, used when the map cannot load. */
  addressHref: string | null
  directionsText?: string | null
  airportNote?: string | null
  /** Shown when the map has not loaded or has no address. */
  staticImage?: { src: string; alt: string } | null
}

interface MapCardProps {
  /** Defaults to the home page's site settings. */
  data?: MapCardData
  heading?: string
  /** Load the map when it scrolls into view. Without it, the guest taps "Show map". */
  loadOnView?: boolean
}

const fromSite = (): MapCardData => ({
  addressLines: site.address.lines,
  reception: site.reception,
  landmarks: site.landmarks,
  telHref: telHref(),
  embedSrc: mapEmbedSrc(),
  directionsHref: directionsHref(),
  addressHref: null,
})

/** Address, directions, call button and a map that loads late (on tap, or when scrolled into view), with a static fallback. */
export function MapCard({ data, heading = 'Find us', loadOnView = false }: MapCardProps) {
  const d = data ?? fromSite()
  const [loaded, setLoaded] = useState(false)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = frame.current
    if (!loadOnView || !el || !d.embedSrc) return
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setLoaded(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadOnView, d.embedSrc])

  return (
    <section aria-labelledby="location-heading" className="section-y">
      <div className="container-page grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <h2 id="location-heading" className="font-display text-h2">{heading}</h2>
          <address className="mt-6 flex gap-3 not-italic">
            <MapPin className="mt-1 size-5 shrink-0 text-accent-ink" aria-hidden />
            <span>{d.addressLines.map((line) => <span key={line} className="block">{line}</span>)}</span>
          </address>
          {d.reception && (
            <p className="mt-4 flex gap-3">
              <Clock className="mt-1 size-5 shrink-0 text-accent-ink" aria-hidden />
              <span><span className="font-semibold">Reception: </span>{d.reception}</span>
            </p>
          )}
          {d.directionsText && <p className="mt-4 text-small text-ink/85">{d.directionsText}</p>}
          {d.airportNote && <p className="mt-2 text-small text-ink/85"><span className="font-semibold">Airport: </span>{d.airportNote}</p>}
          {d.landmarks.length > 0 && (
            <ul aria-label="Nearby landmarks" className="mt-4 space-y-1 text-small text-muted">
              {d.landmarks.slice(0, 4).map((l) => <li key={l.name}>{l.name}, {l.distance}</li>)}
            </ul>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {d.directionsHref ? (
              <ButtonLink href={d.directionsHref} external icon={<Navigation className="size-5" aria-hidden />}>
                Get Directions<span className="sr-only"> (opens in a new tab)</span>
              </ButtonLink>
            ) : (
              <Button disabled icon={<Navigation className="size-5" aria-hidden />}>Get Directions</Button>
            )}
            <ButtonLink href={d.telHref} variant="secondary" icon={<Phone className="size-5" aria-hidden />}>
              {d.phoneDisplay ? `Call ${d.phoneDisplay}` : 'Call reception'}
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div ref={frame} className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-ink/10 md:aspect-[16/10]">
            {loaded && d.embedSrc ? (
              <iframe
                title="Map showing the hotel's location"
                src={d.embedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <>
                {d.staticImage && <Photo src={d.staticImage.src} alt={d.staticImage.alt} sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 h-full w-full" />}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center ${d.staticImage ? 'bg-ink/30 text-white' : ''}`}>
                  <MapPin className="size-10 opacity-70" aria-hidden />
                  {d.embedSrc ? (
                    loadOnView ? <p className="text-small">Loading the map as you scroll.</p> : <Button variant="dark" onClick={() => setLoaded(true)}>Show map</Button>
                  ) : (
                    <p className="max-w-xs text-small">The map appears here once the hotel address is added.</p>
                  )}
                  {d.addressHref && (
                    <a href={d.addressHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                      Open the address in Maps<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

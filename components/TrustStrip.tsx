"use client";

import { BadgeCheck, Lock, ShieldCheck, Star, type LucideIcon } from 'lucide-react'
import { site } from '@/lib/site'
import type { TrustItem } from '@/lib/types'
import { StaggerGroup } from './motion/StaggerGroup'
import { StaggerItem } from './motion/StaggerItem'

const icons: Record<TrustItem['id'], LucideIcon> = {
  reviews: Star,
  'secure-payment': Lock,
  'free-cancellation': BadgeCheck,
  'power-security': ShieldCheck,
}

function reviewsLabel(fallback: string): string {
  const { rating, count } = site.reviews
  // No invented numbers: show the score only once real values are supplied.
  return rating !== null && count !== null ? `${rating.toFixed(1)} on Google from ${count} reviews` : fallback
}

/** Trust signals under the search bar. Items switch on and off in site.ts. */
export function TrustStrip({ revealDelay = 0 }: { revealDelay?: number }) {
  const items = site.trust.filter((t) => t.enabled)
  if (items.length === 0) return null

  return (
    <StaggerGroup
      as="ul"
      staggerChildren={0.06}
      delayChildren={revealDelay}
      className="mt-6 grid grid-cols-1 gap-x-8 gap-y-1 text-small font-medium sm:grid-cols-2 md:flex md:flex-wrap md:justify-center"
    >
      {items.map((item) => {
        const Icon = icons[item.id]
        const label = item.id === 'reviews' ? reviewsLabel(item.label) : item.label
        const inner = (
          <>
            <Icon className="size-5 shrink-0 text-accent-ink" aria-hidden />
            <span>{label}</span>
          </>
        )
        return (
          <StaggerItem as="li" key={item.id}>
            {item.id === 'reviews' && site.googleReviewsUrl ? (
              <a
                href={site.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 underline decoration-accent decoration-2 underline-offset-4"
              >
                {inner}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2">{inner}</span>
            )}
          </StaggerItem>
        )
      })}
    </StaggerGroup>
  )
}

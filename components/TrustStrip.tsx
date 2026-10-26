'use client';

import {
  BadgeCheck,
  Lock,
  ShieldCheck,
  Star,
  type LucideIcon,
} from 'lucide-react';

import { useSite } from '@/providers/site.provider';
import type { SiteConfig, TrustItem } from '@/types/site.types';

import { StaggerGroup } from './motion/StaggerGroup';
import { StaggerItem } from './motion/StaggerItem';

const icons: Record<TrustItem['id'], LucideIcon> = {
  reviews: Star,
  'secure-payment': Lock,
  'free-cancellation': BadgeCheck,
  'power-security': ShieldCheck,
};

function reviewsLabel(site: SiteConfig, fallback: string): string {
  const { rating, count } = site.reviews;
  // No invented numbers: show the score only once real values are supplied.
  return rating !== null && count !== null
    ? `${rating.toFixed(1)} on Google from ${count} reviews`
    : fallback;
}

/** Trust signals under the search bar, loaded from the database settings. */
export function TrustStrip({ revealDelay = 0 }: { revealDelay?: number }) {
  const site = useSite();
  const items = site.trust.filter((t) => t.enabled);
  if (items.length === 0) return null;

  return (
    <StaggerGroup
      as="ul"
      staggerChildren={0.06}
      delayChildren={revealDelay}
      className="text-small mt-6 grid grid-cols-1 gap-x-8 gap-y-1 font-medium sm:grid-cols-2 md:flex md:flex-wrap md:justify-center"
    >
      {items.map((item) => {
        const Icon = icons[item.id];
        const label =
          item.id === 'reviews' ? reviewsLabel(site, item.label) : item.label;
        const inner = (
          <>
            <Icon className="text-accent-ink size-5 shrink-0" aria-hidden />
            <span>{label}</span>
          </>
        );
        return (
          <StaggerItem as="li" key={item.id}>
            {item.id === 'reviews' && site.googleReviewsUrl ? (
              <a
                href={site.googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="decoration-accent inline-flex min-h-11 items-center gap-2 underline decoration-2 underline-offset-4"
              >
                {inner}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2">
                {inner}
              </span>
            )}
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}

'use client';

import { BedDouble, ImageIcon, Users } from 'lucide-react';

import { formatNaira, formatSecondary } from '@/lib/format';
import { roomAmenityLabels as amenityLabels } from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { Room } from '@/types/site.types';

import { AmenityIcon } from './AmenityIcon';
import { Carousel } from './Carousel';
import {
  RoomCardListing,
  type RoomCardListingProps,
} from './rooms/RoomCardListing';
import { ButtonLink } from './ui/Button';
import { Photo } from './ui/Photo';

const PHOTO_SIZES =
  '(min-width: 1440px) 22vw, (min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw';

export type RoomCardProps =
  | { variant?: 'feature'; room: Room; stayQuery?: string; compact?: boolean }
  | ({ variant: 'listing' } & RoomCardListingProps);

/**
 * `feature` (default) is the home page card. `listing` is the richer card on the Rooms page.
 * Existing home page usage, <RoomCard room={room} />, is unchanged.
 */
export function RoomCard(props: RoomCardProps) {
  if (props.variant === 'listing') {
    return <RoomCardListing {...props} />;
  }
  return (
    <FeatureRoomCard
      room={props.room}
      stayQuery={props.stayQuery}
      compact={props.compact}
    />
  );
}

/**
 * `stayQuery` (e.g. "checkIn=...&adults=2") is appended to the detail and booking links so the chosen stay carries through.
 * `compact` drops the amenities and the Book button, leaving one secondary action.
 */
function FeatureRoomCard({
  room,
  stayQuery = '',
  compact = false,
}: {
  room: Room;
  stayQuery?: string;
  compact?: boolean;
}) {
  const site = useSite();
  const nameId = `${room.id}-name`;
  const showPrice = !room.priceHidden && room.priceNgn !== null;
  const detailHref = `/rooms/${room.slug}${stayQuery ? `?${stayQuery}` : ''}`;
  const bookHref = `${site.bookingHref}?room=${encodeURIComponent(room.slug)}${stayQuery ? `&${stayQuery}` : ''}`;

  return (
    <article
      aria-labelledby={nameId}
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-raised transition-shadow duration-200 focus-within:shadow-float hover:shadow-float"
    >
      {room.images.length > 0 ? (
        <Carousel
          label={`${room.name} photos`}
          slides={room.images.map((img) => (
            <Photo
              key={img.src}
              src={img.src}
              alt={img.alt}
              sizes={PHOTO_SIZES}
              className="aspect-[4/3] w-full"
            />
          ))}
        />
      ) : (
        <div
          role="img"
          aria-label={`No photos yet for ${room.name}`}
          className="grid aspect-[4/3] w-full place-items-center bg-ink/5 text-ink/50"
        >
          <ImageIcon className="size-8" aria-hidden />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3
            id={nameId}
            className="line-clamp-2 min-h-[2.6em] font-display text-h3"
          >
            {room.name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden />
              {room.bedType}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              Up to {room.maxGuests} guests
            </span>
          </p>
        </div>

        {!compact && (
          <ul
            aria-label="Key amenities"
            className="flex flex-wrap gap-x-4 gap-y-2 text-small"
          >
            {room.amenities.slice(0, 3).map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <AmenityIcon name={key} className="size-4 text-accent-ink" />
                {amenityLabels[key]}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-2">
          {showPrice ? (
            <p>
              <span className="text-small text-muted">From </span>
              <span className="font-display text-2xl">
                {formatNaira(room.priceNgn as number)}
              </span>
              <span className="text-small text-muted"> / night</span>
              {room.secondaryPrice && (
                <span className="ml-2 text-small text-muted">
                  about{' '}
                  {formatSecondary(
                    room.secondaryPrice.currency,
                    room.secondaryPrice.amount,
                  )}
                </span>
              )}
            </p>
          ) : (
            <p>
              <a
                href={whatsappHref(
                  site,
                  `Hello, what is the price for the ${room.name}?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
              >
                Contact us for price
                <span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </a>
            </p>
          )}
          <div
            className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            <ButtonLink href={detailHref} variant="secondary" size="sm">
              View Details
            </ButtonLink>
            {!compact && (
              <ButtonLink href={bookHref} size="sm">
                Book
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

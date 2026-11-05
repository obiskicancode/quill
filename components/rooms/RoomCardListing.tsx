'use client';

import { Camera } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';
import { formatShort } from '@/lib/dates';
import { formatNaira, pluralCount } from '@/lib/format';
import {
  formatRange,
  groupAmenities,
  roomAmenityLabels,
  stayHref,
} from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { ISODate } from '@/types/dates.types';
import type {
  RoomAvailability,
  RoomQuery,
  RoomType,
} from '@/types/rooms.types';

import { Carousel } from '../Carousel';
import { AmenitiesModal } from '../room-detail/AmenitiesModal';
import { Button, ButtonLink } from '../ui/button';
import { Photo } from '../ui/Photo';
import { AvailabilityBadge, Badge } from './AvailabilityBadge';
import { LazyPhoto } from './LazyPhoto';
import { PriceBlock } from './PriceBlock';
import { RoomAmenityIcon } from './RoomAmenityIcon';

const PHOTO_SIZES =
  '(min-width: 1440px) 30vw, (min-width: 1024px) 40vw, (min-width: 768px) 90vw, 100vw';
const MAX_AMENITIES_SHOWN = 3;

const sleepsLabel = (adults: number, children: number, joiner = ' + ') =>
  `${pluralCount(adults, 'adult')}${
    children > 0 ? `${joiner}${pluralCount(children, 'child', 'children')}` : ''
  }`;

export interface RoomCardListingProps {
  room: RoomType;
  index: number;
  query: RoomQuery;
  liveState: 'idle' | 'loading' | 'ready' | 'error';
  availability: RoomAvailability | null;
  onCheckAvailability: () => void;
  onRetryPrice: () => void;
  onPickDates: (range: { checkIn: ISODate; checkOut: ISODate }) => void;
}

export function RoomCardListing({
  room,
  index,
  query,
  liveState,
  availability,
  onCheckAvailability,
  onRetryPrice,
  onPickDates,
}: RoomCardListingProps) {
  const site = useSite();
  const nameId = `${room.id}-name`;
  const live = liveState === 'ready' ? availability : null;
  const soldOut = live?.status === 'sold-out';
  const onRequest = !room.showPrice || live?.status === 'on-request';
  const overCapacity = live?.status === 'over-capacity';

  const shown = room.amenities.slice(0, MAX_AMENITIES_SHOWN);
  const hidden = room.amenities.slice(MAX_AMENITIES_SHOWN);

  const sleeps = sleepsLabel(room.maxAdults, room.maxChildren);
  const specs = [
    `Sleeps ${sleeps}`,
    room.bedConfig,
    room.sizeSqm ? `${room.sizeSqm} sqm` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const perks = [
    room.breakfastIncluded && 'Breakfast included',
    room.extraBed.available &&
      (room.extraBed.feeNgn === 0
        ? 'Extra bed free'
        : `Extra bed ${formatNaira(room.extraBed.feeNgn ?? 0)} / night`),
  ].filter(Boolean);

  const askLink = stayHref('/contact', query, {
    room: room.slug,
    topic: 'booking_enquiry',
  });

  const askPriceOnWhatsApp = whatsappHref(
    site,
    `Hello, could you send me a price for ${room.name}${
      query.checkIn && query.checkOut
        ? `, ${formatRange(query.checkIn, query.checkOut)}`
        : ''
    }.`,
  );

  const detail = (
    <ButtonLink
      href={stayHref(`/rooms/${room.slug}`, query)}
      variant="secondary"
      className="flex-1"
    >
      View Details
    </ButtonLink>
  );

  let primary: React.ReactNode = null;
  if (onRequest) {
    primary = (
      <ButtonLink href={askLink} className="flex-1">
        Enquire
      </ButtonLink>
    );
  } else if (overCapacity) {
    primary = (
      <ButtonLink href={askLink} className="flex-1">
        Ask about a larger room
      </ButtonLink>
    );
  } else if (soldOut) {
    primary = (
      <ButtonLink href={askLink} className="flex-1">
        Ask about these dates
      </ButtonLink>
    );
  } else if (live?.status === 'min-stay') {
    const checkOut = live.suggestedCheckOut;
    primary = (
      <Button
        className="flex-1"
        onClick={() =>
          query.checkIn && onPickDates({ checkIn: query.checkIn, checkOut })
        }
      >
        Update dates
      </Button>
    );
  } else if (live?.status === 'available' || liveState === 'error') {
    primary = (
      <ButtonLink
        href={stayHref(site.bookingHref, query, { room: room.slug })}
        className="flex-1"
      >
        Book Now
      </ButtonLink>
    );
  } else if (liveState === 'loading') {
    primary = (
      <Button loading className="flex-1">
        Checking
      </Button>
    );
  } else {
    primary = (
      <Button className="flex-1" onClick={onCheckAvailability}>
        Check availability
      </Button>
    );
  }

  const slides = room.images.map((img, i) =>
    i === 0 ? (
      <Photo
        key={img.src}
        src={img.src}
        alt={img.alt}
        sizes={PHOTO_SIZES}
        priority={index < 2}
        className="aspect-4/3 w-full"
      />
    ) : (
      <LazyPhoto
        key={img.src}
        src={img.src}
        alt={img.alt}
        sizes={PHOTO_SIZES}
      />
    ),
  );

  return (
    <article
      aria-labelledby={nameId}
      className={`flex h-full flex-col overflow-hidden rounded-card border shadow-raised transition-shadow duration-200 focus-within:shadow-float hover:shadow-float ${
        soldOut ? 'border-line bg-paper' : 'border-line bg-card'
      }`}
    >
      <div className={`relative ${soldOut ? 'grayscale' : ''}`}>
        <Carousel
          label={`${room.name} photos`}
          itemNoun="photo"
          slides={slides}
        />
        <div className="pointer-events-none absolute top-3 left-3 z-10">
          <Badge
            tone="overlay"
            icon={<Camera className="size-3.5" aria-hidden />}
          >
            {room.images.length} {room.images.length === 1 ? 'photo' : 'photos'}
          </Badge>
        </div>
        {room.popular && (
          <div className="pointer-events-none absolute top-3 right-3 z-10">
            <Badge tone="accent">Most popular</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 id={nameId} className="line-clamp-2 font-display text-h3">
            {room.name}
          </h3>
          <p className="mt-1 text-small text-muted-foreground">{specs}</p>
          {perks.length > 0 && (
            <p className="mt-1 text-small text-brand-ink">
              {perks.join(' · ')}
            </p>
          )}
        </div>

        {shown.length > 0 && (
          <ul
            aria-label="Amenities"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small"
          >
            {shown.map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <RoomAmenityIcon name={key} className="size-4 text-brand-ink" />
                {roomAmenityLabels[key]}
              </li>
            ))}
            {hidden.length > 0 && (
              <li className="inline-flex items-center">
                <AmenitiesModal
                  total={room.amenities.length}
                  groups={groupAmenities(room.amenities)}
                  trigger={
                    <>
                      +{hidden.length} more
                      <span className="sr-only"> amenities</span>
                    </>
                  }
                />
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto space-y-4 pt-2">
          <div className="flex items-start justify-between gap-3">
            <PriceBlock
              room={room}
              availability={live}
              liveFailed={liveState === 'error'}
              pending={liveState === 'loading'}
              onRetry={onRetryPrice}
            />
            {live && (
              <AvailabilityBadge
                soldOut={soldOut}
                remaining={
                  live.status === 'available' ? live.remaining : undefined
                }
              />
            )}
          </div>

          {soldOut && live.status === 'sold-out' ? (
            <div>
              <p className="font-semibold">Not available for these dates</p>
              {live.suggestions.length > 0 ? (
                <>
                  <p className="mt-1 text-small text-muted-foreground">
                    Nearby dates that are free:
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {live.suggestions.map((s) => (
                      <li key={s.checkIn}>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            onPickDates({
                              checkIn: s.checkIn,
                              checkOut: s.checkOut,
                            })
                          }
                        >
                          {formatRange(s.checkIn, s.checkOut)}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-small text-muted-foreground">
                  No nearby dates are free. Ask us and we will look for options.
                </p>
              )}
            </div>
          ) : overCapacity && live.status === 'over-capacity' ? (
            <div>
              <p className="font-semibold">Too small for your group</p>
              <p className="mt-1 text-small text-muted-foreground">
                This room sleeps up to{' '}
                {sleepsLabel(live.maxAdults, live.maxChildren, ' and ')}. Ask us
                about two rooms or a larger apartment.
              </p>
            </div>
          ) : live?.status === 'min-stay' ? (
            <div>
              <p className="font-semibold">
                Minimum stay: {pluralCount(live.minNights, 'night')}
              </p>
              <p className="mt-1 text-small text-muted-foreground">
                Move your check-out to {formatShort(live.suggestedCheckOut)} to
                book this room.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {detail}
            {primary}
          </div>

          {onRequest && (
            <TextLink href={askPriceOnWhatsApp} external>
              Prefer to ask in person? Message us on WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </TextLink>
          )}
        </div>
      </div>
    </article>
  );
}

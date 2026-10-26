'use client';

import { BedDouble, BedSingle, Camera, Ruler, Users } from 'lucide-react';

import { formatShort, type ISODate } from '@/lib/dates';
import { formatNaira } from '@/lib/format';
import type { RoomAvailability } from '@/lib/rooms';
import {
  formatRange,
  roomAmenityLabels,
  stayHref,
  type RoomQuery,
  type RoomType,
} from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';

import { Carousel } from '../Carousel';
import { Button, ButtonLink } from '../ui/Button';
import { Photo } from '../ui/Photo';
import { TextLink } from '../ui/TextLink';
import { AvailabilityBadge, Badge } from './AvailabilityBadge';
import { LazyPhoto } from './LazyPhoto';
import { PriceBlock } from './PriceBlock';
import { RoomAmenityIcon } from './RoomAmenityIcon';

const PHOTO_SIZES =
  '(min-width: 1440px) 30vw, (min-width: 1024px) 40vw, (min-width: 768px) 90vw, 100vw';
const MAX_AMENITIES_SHOWN = 4;

export interface RoomCardListingProps {
  room: RoomType;
  /** Position in the list. The first two cards load their first photo eagerly. */
  index: number;
  query: RoomQuery;
  /** 'idle' = no dates yet, 'ready' = live result in `availability`, 'error' = live prices failed. */
  liveState: 'idle' | 'ready' | 'error';
  availability: RoomAvailability | null;
  onCheckAvailability: () => void;
  onPickDates: (range: { checkIn: ISODate; checkOut: ISODate }) => void;
}

/**
 * Listing variant of RoomCard. Same shell, carousel, photo and button components as the home page card,
 * with more detail and every availability state. One filled button at most.
 */
export function RoomCardListing({
  room,
  index,
  query,
  liveState,
  availability,
  onCheckAvailability,
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

  const ask = (text: string) =>
    whatsappHref(
      site,
      `Hello, ${text} (${room.name}${query.checkIn && query.checkOut ? `, ${formatRange(query.checkIn, query.checkOut)}` : ''}).`,
    );

  const detail = (
    <ButtonLink
      href={stayHref(`/rooms/${room.slug}`, query)}
      variant="secondary"
      size="sm"
      className="flex-1"
    >
      View Details
    </ButtonLink>
  );

  let primary: React.ReactNode = null;
  if (onRequest) {
    primary = (
      <ButtonLink
        href={stayHref('/contact', query, { room: room.slug, topic: 'price' })}
        size="sm"
        className="flex-1"
      >
        Enquire
      </ButtonLink>
    );
  } else if (soldOut || overCapacity) {
    primary = null;
  } else if (live?.status === 'min-stay') {
    const checkOut = live.suggestedCheckOut;
    primary = (
      <Button
        size="sm"
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
        size="sm"
        className="flex-1"
      >
        Book Now
      </ButtonLink>
    );
  } else {
    primary = (
      <Button size="sm" className="flex-1" onClick={onCheckAvailability}>
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
        className="aspect-[4/3] w-full"
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
      className={`rounded-card shadow-raised focus-within:shadow-float hover:shadow-float flex h-full flex-col overflow-hidden border transition-shadow duration-200 ${
        soldOut ? 'border-line bg-paper' : 'border-line bg-surface'
      }`}
    >
      <div className={`relative ${soldOut ? 'grayscale' : ''}`}>
        <Carousel label={`${room.name} photos`} slides={slides} />
        <div className="pointer-events-none absolute top-3 left-3 z-10">
          <Badge
            tone="overlay"
            icon={<Camera className="size-3.5" aria-hidden />}
          >
            {room.images.length} {room.images.length === 1 ? 'photo' : 'photos'}
          </Badge>
        </div>
        {live && (
          <div className="pointer-events-none absolute top-3 right-3 z-10">
            <AvailabilityBadge
              soldOut={soldOut}
              remaining={
                live.status === 'available' ? live.remaining : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3
          id={nameId}
          className="font-display text-h3 line-clamp-2 min-h-[2.6em]"
        >
          {room.name}
        </h3>

        <div className="flex min-h-7 flex-wrap gap-2">
          {room.popular && <Badge tone="accent">Most popular</Badge>}
          {room.breakfastIncluded && <Badge>Breakfast included</Badge>}
          {room.extraBed.available && <Badge>Extra bed available</Badge>}
        </div>

        <p className="text-small text-ink/85 line-clamp-2 min-h-12">
          {room.description}
        </p>

        <ul className="text-small space-y-2">
          <li className="flex items-center gap-2">
            <Ruler className="text-accent-ink size-4 shrink-0" aria-hidden />
            {room.sizeSqm} sqm
          </li>
          <li className="flex items-center gap-2">
            <BedDouble
              className="text-accent-ink size-4 shrink-0"
              aria-hidden
            />
            {room.bedConfig}
          </li>
          <li className="flex items-center gap-2">
            <Users className="text-accent-ink size-4 shrink-0" aria-hidden />
            Up to {room.maxAdults} {room.maxAdults === 1 ? 'adult' : 'adults'},{' '}
            {room.maxChildren} {room.maxChildren === 1 ? 'child' : 'children'}
          </li>
          <li className="flex items-center gap-2">
            <BedSingle
              className="text-accent-ink size-4 shrink-0"
              aria-hidden
            />
            {room.extraBed.available
              ? room.extraBed.feeNgn === 0
                ? 'Extra bed: free'
                : `Extra bed: ${formatNaira(room.extraBed.feeNgn ?? 0)} / night`
              : 'Extra bed: not available'}
          </li>
        </ul>

        <ul
          aria-label="Amenities"
          className="text-small flex min-h-[3.25rem] flex-wrap content-start gap-x-4 gap-y-2"
        >
          {shown.map((key) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <RoomAmenityIcon name={key} className="text-accent-ink size-4" />
              {roomAmenityLabels[key]}
            </li>
          ))}
          {hidden.length > 0 && (
            <li className="inline-flex items-center font-semibold">
              +{hidden.length} more
              <span className="sr-only">
                : {hidden.map((k) => roomAmenityLabels[k]).join(', ')}
              </span>
            </li>
          )}
        </ul>

        <div className="mt-auto space-y-4 pt-2">
          {soldOut ? (
            <div>
              <p className="font-semibold">Not available for these dates</p>
              {live.status === 'sold-out' && live.suggestions.length > 0 ? (
                <>
                  <p className="text-small text-muted mt-1">
                    Nearby dates that are free:
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {live.suggestions.map((s) => (
                      <li key={s.checkIn}>
                        <Button
                          variant="secondary"
                          size="sm"
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
                <p className="text-small text-muted mt-1">
                  No nearby dates are free. Message us and we will look for
                  options.
                </p>
              )}
            </div>
          ) : overCapacity && live.status === 'over-capacity' ? (
            <div className="min-h-[5.5rem]">
              <p className="font-semibold">Too small for your group</p>
              <p className="text-small text-muted mt-1">
                This room sleeps up to {live.maxAdults} adults and{' '}
                {live.maxChildren} children. Ask us about two rooms or a larger
                apartment.
              </p>
            </div>
          ) : live?.status === 'min-stay' ? (
            <div className="min-h-[5.5rem]">
              <p className="font-semibold">
                Minimum stay: {live.minNights} nights
              </p>
              <p className="text-small text-muted mt-1">
                Move your check-out to {formatShort(live.suggestedCheckOut)} to
                book this room.
              </p>
            </div>
          ) : (
            <PriceBlock
              room={room}
              availability={live}
              liveFailed={liveState === 'error'}
            />
          )}

          <div className="flex flex-wrap gap-3">
            {detail}
            {primary}
          </div>

          {(onRequest || soldOut || overCapacity) && (
            <TextLink
              href={ask(
                onRequest
                  ? 'could you send me a price'
                  : 'can you help me find a room',
              )}
              external
            >
              Ask on WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </TextLink>
          )}
        </div>
      </div>
    </article>
  );
}

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Breadcrumb } from '@/components/Breadcrumb';
import { CtaBand } from '@/components/CtaBand';
import { Reveal } from '@/components/motion/Reveal';
import { AmenitiesSection } from '@/components/room-detail/AmenitiesSection';
import { AskCard } from '@/components/room-detail/AskCard';
import { BookingCard } from '@/components/room-detail/BookingCard';
import { GoodToKnow } from '@/components/room-detail/GoodToKnow';
import { KeyFacts } from '@/components/room-detail/KeyFacts';
import { ReadMore } from '@/components/room-detail/ReadMore';
import { RoomGallery } from '@/components/room-detail/RoomGallery';
import { RoomReviews } from '@/components/room-detail/RoomReviews';
import { SimilarRooms } from '@/components/room-detail/SimilarRooms';
import { TitleBlock } from '@/components/room-detail/TitleBlock';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { bookingHref, stayParams } from '@/lib/booking/links';
import { getPublicSite } from '@/lib/content/data';
import { hotelClock } from '@/lib/dates';
import {
  baseGuests,
  bedTypeLabels,
  maxGuests,
  parseRoomQuery,
  roomAmenityLabels,
  stayHref,
} from '@/lib/rooms';
import {
  getPricingSettings,
  getRoomDetail,
  getSimilarRooms,
} from '@/lib/rooms/detail';
import { needsExtraBed, priceStay, validateStay } from '@/lib/rooms/pricing';
import type { RoomBookingSummary } from '@/types/checkout.types';
import type { RoomDetail } from '@/types/rooms.types';
import type { SiteConfig } from '@/types/site.types';
import type { StayInput } from '@/types/stay.types';

type SearchParams = Record<string, string | string[] | undefined>;
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

const paramsLike = (sp: SearchParams) => ({
  get: (name: string) => {
    const v = sp[name];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  },
});

export async function generateMetadata({
  params,
}: Pick<PageProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const [room, site] = await Promise.all([
    getRoomDetail(slug),
    getPublicSite(),
  ]);
  if (!room) return { title: ERROR_MESSAGES.ROOM_NOT_FOUND_BARE };
  const description =
    room.metaDescription ??
    (room.description.length > 155
      ? `${room.description.slice(0, 152)}...`
      : room.description);
  const cover = room.gallery[0];
  return {
    title: room.metaTitle ?? room.name,
    description,
    openGraph: {
      title: room.metaTitle ?? `${room.name} | ${site.name}`,
      description,
      type: 'website',
      ...(cover ? { images: [{ url: cover.src, alt: cover.alt }] } : {}),
    },
  };
}

function buildJsonLd(
  room: RoomDetail,
  offerHref: string | null,
  totalMinor: number | null,
  site: SiteConfig,
) {
  const absolute = (src: string) => new URL(src, site.url).toString();
  const hotelRoom: Record<string, unknown> = {
    '@type': 'HotelRoom',
    name: room.name,
    description: room.description,
    url: absolute(`/rooms/${room.slug}`),
    bed: { '@type': 'BedDetails', typeOfBed: bedTypeLabels[room.bedType] },
    occupancy: { '@type': 'QuantitativeValue', maxValue: maxGuests(room) },
    floorSize: {
      '@type': 'QuantitativeValue',
      value: room.sizeSqm,
      unitCode: 'MTK',
    },
    image: room.gallery.map((g) => absolute(g.src)),
    amenityFeature: room.amenities.map((k) => ({
      '@type': 'LocationFeatureSpecification',
      name: roomAmenityLabels[k],
      value: true,
    })),
  };
  // Offers only when the price is public and the dates are known and valid.
  if (offerHref && totalMinor !== null) {
    hotelRoom.offers = {
      '@type': 'Offer',
      price: (totalMinor / 100).toFixed(2),
      priceCurrency: 'NGN',
      url: absolute(offerHref),
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: site.name,
    url: site.url,
    description: site.description,
    containsPlace: hotelRoom,
  };
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const [room, hotelSettings, site] = await Promise.all([
    getRoomDetail(slug),
    getPricingSettings(),
    getPublicSite(),
  ]);
  if (!room) notFound();

  const sp = await searchParams;
  const q = parseRoomQuery(paramsLike(sp));

  const needs = needsExtraBed(room, q.adults, q.children);
  const initial: StayInput = {
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    adults: q.adults,
    children: q.children,
    extraBed: paramsLike(sp).get('extraBed') === '0' ? false : needs,
  };

  const bookingRoom: RoomBookingSummary = {
    slug: room.slug,
    name: room.name,
    maxAdults: room.maxAdults,
    maxChildren: room.maxChildren,
    baseGuests: baseGuests(room),
    showPrice: room.showPrice,
    basePriceNgn: room.basePriceNgn,
    taxesIncluded: room.taxesIncluded,
    extraBed: {
      available: room.extraBed.available,
      priceMinor: room.extraBedPriceMinor,
    },
  };

  // JSON-LD offer: only for a public price with valid dates.
  let offerHref: string | null = null;
  let totalMinor: number | null = null;
  if (room.showPrice && initial.checkIn && initial.checkOut) {
    const clock = hotelClock();
    const valid =
      validateStay(
        room,
        hotelSettings,
        { ...initial, checkIn: initial.checkIn, checkOut: initial.checkOut },
        clock,
      ).length === 0;
    if (valid) {
      totalMinor = priceStay(
        room,
        hotelSettings,
        initial.checkIn,
        initial.checkOut,
        initial.extraBed && needs,
        clock.today,
      ).totalMinor;
      offerHref = bookingHref(site.bookingHref, room.slug, initial);
    }
  }
  const jsonLd = JSON.stringify(
    buildJsonLd(room, offerHref, totalMinor, site),
  ).replace(/</g, '\\u003c');
  const stayQuery = stayParams(initial).toString();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <div className="container-page pt-4 pb-6 md:pt-6">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Rooms', href: stayHref('/rooms', q) },
            { label: room.name },
          ]}
        />
        <div className="mt-4">
          <RoomGallery roomName={room.name} images={room.gallery} />
        </div>
      </div>

      <div className="container-page pt-6 pb-4">
        <TitleBlock room={room} />
      </div>

      <div className="container-page pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-12">
          <section aria-labelledby="about-title">
            <Reveal>
              <h2 id="about-title" className="font-display text-h3 mb-3">
                About this room
              </h2>
              <ReadMore text={room.description} />
            </Reveal>
          </section>
          <KeyFacts room={room} />
          <AmenitiesSection room={room} />
          <GoodToKnow room={room} hotel={hotelSettings} />
          <RoomReviews reviews={room.testimonials} />
          <AskCard
            roomName={room.name}
            checkIn={q.checkIn}
            checkOut={q.checkOut}
          />
        </div>
        <aside aria-label="Booking" className="mt-12 lg:mt-0">
          <BookingCard
            room={bookingRoom}
            initial={initial}
            bestPriceDirect={hotelSettings.bestPriceDirect}
          />
        </aside>
      </div>

      <SimilarRooms
        rooms={await getSimilarRooms(room, 3)}
        stayQuery={stayQuery}
      />
      <div className="mt-16 md:mt-24">
        <CtaBand />
      </div>
      {/* Clears the fixed booking bar on mobile and tablet. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </>
  );
}

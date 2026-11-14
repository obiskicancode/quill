import { and, eq } from 'drizzle-orm';

import {
  amenities,
  enquiries,
  enquiryNotes,
  enquiryReplies,
  extras,
  facilities,
  faqs,
  galleryImages,
  hotelSettings,
  nearbyAttractions,
  notificationLogs,
  paymentProofs,
  payments,
  paymentWebhookEvents,
  rateRules,
  refunds,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
  roomBlocks,
  rooms,
  roomTypeAmenities,
  roomTypes,
  staffUsers,
  teamMembers,
  testimonials,
} from '@/db/schema';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import {
  addDays,
  addMonths,
  hotelClock,
  nightsBetween,
  startOfMonth,
  sundayIndex,
} from '@/lib/dates';
import type { ISODate } from '@/types/dates.types';

import { requiredEnv } from './args';
import { generateDemoImages } from './demo-images';
import { createSeededRandom, deterministicUuid } from './deterministic';
import { recordSeed, type SeedExecutor } from './seed-records';

const DEMO_SEED = 'demo' as const;
const DEMO_GUEST_DOMAIN = 'example.test';
const DEMO_IP = '203.0.113.10';

const id = (key: string) => deterministicUuid(DEMO_SEED, key);

interface RoomTypeDef {
  key: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  bedConfig: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  basePriceMinor: number;
  weekendPriceMinor: number | null;
  sizeSqm: string;
  isFeatured: boolean;
  coverImage: string;
  amenities: string[];
  rooms: { number: string; floor: string }[];
}

const ROOM_TYPE_DEFS: RoomTypeDef[] = [
  {
    key: 'standard',
    name: 'Standard Room',
    slug: 'demo-standard-room',
    shortDescription: 'Comfortable demo room with a queen bed.',
    description:
      'A demo room type used for local development and screenshots. It is not a real room category.',
    bedConfig: '1 queen bed',
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    basePriceMinor: 45_000_00,
    weekendPriceMinor: null,
    sizeSqm: '28.00',
    isFeatured: true,
    coverImage: '/seed/demo/gallery/demo-room.webp',
    amenities: ['wifi', 'power', 'security'],
    rooms: [
      { number: '101', floor: '1' },
      { number: '102', floor: '1' },
      { number: '103', floor: '1' },
      { number: '104', floor: '1' },
    ],
  },
  {
    key: 'deluxe',
    name: 'Deluxe Room',
    slug: 'demo-deluxe-room',
    shortDescription: 'Larger demo room with a lounge corner.',
    description:
      'A demo room type used for local development and screenshots. It is not a real room category.',
    bedConfig: '1 king bed',
    maxAdults: 2,
    maxChildren: 2,
    maxOccupancy: 4,
    basePriceMinor: 65_000_00,
    weekendPriceMinor: 75_000_00,
    sizeSqm: '36.00',
    isFeatured: true,
    coverImage: '/seed/demo/gallery/demo-suite.webp',
    amenities: ['wifi', 'power', 'security', 'parking'],
    rooms: [
      { number: '105', floor: '1' },
      { number: '106', floor: '1' },
      { number: '107', floor: '1' },
    ],
  },
  {
    key: 'executive',
    name: 'Executive Suite',
    slug: 'demo-executive-suite',
    shortDescription: 'Demo suite with a separate living area.',
    description:
      'A demo room type used for local development and screenshots. It is not a real room category.',
    bedConfig: '1 king bed + sofa bed',
    maxAdults: 3,
    maxChildren: 2,
    maxOccupancy: 5,
    basePriceMinor: 95_000_00,
    weekendPriceMinor: 110_000_00,
    sizeSqm: '52.00',
    isFeatured: true,
    coverImage: '/seed/demo/gallery/demo-suite.webp',
    amenities: ['wifi', 'power', 'security', 'parking', 'conference'],
    rooms: [
      { number: '201', floor: '2' },
      { number: '202', floor: '2' },
      { number: '203', floor: '2' },
    ],
  },
  {
    key: 'family',
    name: 'Family Apartment',
    slug: 'demo-family-apartment',
    shortDescription: 'Demo apartment with space for a family.',
    description:
      'A demo room type used for local development and screenshots. It is not a real room category.',
    bedConfig: '1 king bed + 2 single beds',
    maxAdults: 4,
    maxChildren: 3,
    maxOccupancy: 7,
    basePriceMinor: 120_000_00,
    weekendPriceMinor: null,
    sizeSqm: '68.00',
    isFeatured: false,
    coverImage: '/seed/demo/gallery/demo-exterior.webp',
    amenities: ['wifi', 'power', 'security', 'parking', 'restaurant'],
    rooms: [
      { number: '204', floor: '2' },
      { number: '205', floor: '2' },
      { number: '206', floor: '2' },
      { number: '207', floor: '2' },
    ],
  },
];

const EXTRA_DEFS = [
  {
    key: 'airport-pickup',
    name: 'Airport pickup',
    slug: 'demo-airport-pickup',
    description: 'Demo airport pickup service.',
    priceMinor: 25_000_00,
    maxQuantity: 2,
    pricingUnit: 'per_stay' as const,
  },
  {
    key: 'breakfast',
    name: 'Breakfast',
    slug: 'demo-breakfast',
    description: 'Demo breakfast add-on.',
    priceMinor: 6_000_00,
    maxQuantity: 4,
    pricingUnit: 'per_night' as const,
  },
  {
    key: 'housekeeping',
    name: 'Extra housekeeping',
    slug: 'demo-extra-housekeeping',
    description: 'Demo extra housekeeping service.',
    priceMinor: 2_500_00,
    maxQuantity: 1,
    pricingUnit: 'per_guest_per_night' as const,
  },
];

const FACILITY_DEFS = [
  {
    key: 'restaurant',
    name: 'Demo Restaurant',
    slug: 'demo-restaurant',
    description: 'Demo restaurant listing for local development.',
    icon: 'utensils',
    kind: 'dining',
    openingHours: '07:00-22:00',
    pricing: 'paid',
    priceNote: 'Demo prices only',
    image: '/seed/demo/gallery/demo-restaurant.webp',
  },
  {
    key: 'pool',
    name: 'Demo Pool',
    slug: 'demo-pool',
    description: 'Demo pool listing for local development.',
    icon: 'waves',
    kind: 'recreation',
    openingHours: '08:00-20:00',
    pricing: 'free',
    priceNote: null,
    image: '/seed/demo/gallery/demo-pool.webp',
  },
  {
    key: 'parking',
    name: 'Demo Parking',
    slug: 'demo-parking',
    description: 'Demo parking listing for local development.',
    icon: 'car',
    kind: 'service',
    openingHours: '24 hours',
    pricing: 'free',
    priceNote: null,
    image: '/seed/demo/gallery/demo-exterior.webp',
  },
  {
    key: 'conference',
    name: 'Demo Conference Room',
    slug: 'demo-conference-room',
    description: 'Demo meeting space listing for local development.',
    icon: 'presentation',
    kind: 'event',
    openingHours: 'By arrangement',
    pricing: 'paid',
    priceNote: 'Demo prices only',
    image: '/seed/demo/gallery/demo-restaurant.webp',
  },
  {
    key: 'gym',
    name: 'Demo Fitness Room',
    slug: 'demo-fitness-room',
    description: 'Demo fitness room listing for local development.',
    icon: 'dumbbell',
    kind: 'recreation',
    openingHours: '05:00-22:00',
    pricing: 'free',
    priceNote: null,
    image: '/seed/demo/gallery/demo-pool.webp',
  },
  {
    key: 'airport-shuttle',
    name: 'Demo Airport Shuttle',
    slug: 'demo-airport-shuttle',
    description: 'Demo airport shuttle listing for local development.',
    icon: 'plane',
    kind: 'service',
    openingHours: 'By arrangement',
    pricing: 'paid',
    priceNote: 'Demo prices only',
    image: '/seed/demo/gallery/demo-surroundings.webp',
  },
];

const FAQ_DEFS = [
  {
    question: 'What time is demo check-in?',
    answer: 'Demo check-in is from 14:00. This answer is sample content only.',
    category: 'stay',
  },
  {
    question: 'Is demo parking available?',
    answer:
      'Demo parking is available on site. This answer is sample content only.',
    category: 'facilities',
  },
  {
    question: 'Can I cancel a demo booking?',
    answer: 'Demo bookings follow the cancellation policy shown at checkout.',
    category: 'booking',
  },
  {
    question: 'Are demo pets allowed?',
    answer: 'Demo pets are not allowed. This answer is sample content only.',
    category: 'stay',
  },
];

const TEAM_DEFS = [
  {
    key: 'manager',
    name: 'Demo Manager',
    role: 'General Manager',
    bio: 'Sample team profile for local development only.',
    email: `demo.manager@${DEMO_GUEST_DOMAIN}`,
  },
  {
    key: 'reception',
    name: 'Demo Receptionist',
    role: 'Front Desk',
    bio: 'Sample team profile for local development only.',
    email: `demo.reception@${DEMO_GUEST_DOMAIN}`,
  },
];

const ATTRACTION_DEFS = [
  {
    key: 'market',
    name: 'Demo Market',
    distance: '2 km',
    description: 'Sample nearby attraction for local development only.',
  },
  {
    key: 'museum',
    name: 'Demo Museum',
    distance: '5 km',
    description: 'Sample nearby attraction for local development only.',
  },
  {
    key: 'beach',
    name: 'Demo Beach',
    distance: '12 km',
    description: 'Sample nearby attraction for local development only.',
  },
];

const TESTIMONIAL_DEFS = [
  {
    guestName: 'Ada Demo',
    location: 'Lagos',
    quote: 'Sample testimonial for local development only.',
    rating: 5,
    stayType: 'Leisure',
  },
  {
    guestName: 'Tunde Sample',
    location: 'Abuja',
    quote: 'Another sample testimonial for local development only.',
    rating: 5,
    stayType: 'Business',
  },
  {
    guestName: 'Chioma Example',
    location: 'Port Harcourt',
    quote: 'A third sample testimonial for local development only.',
    rating: 4,
    stayType: 'Family',
  },
];

interface ReservationScenario {
  key: string;
  roomNumber: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status:
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'checked_out'
    | 'cancelled'
    | 'no_show'
    | 'expired';
  paymentMode: 'full_online' | 'deposit_online' | 'pay_at_hotel';
  confirmationMode: 'instant' | 'manual_approval';
  bookingSource: 'website' | 'admin' | 'phone' | 'walk_in';
  payment:
    | 'full'
    | 'deposit'
    | 'pending_transfer'
    | 'failed'
    | 'refund_paid'
    | 'refund_manual'
    | 'none';
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  extraKeys?: string[];
  notes?: string;
  cancellationReason?: string;
  holdExpired?: boolean;
}

function isFestive(date: ISODate): boolean {
  const monthDay = date.slice(5);
  return monthDay >= '12-20' || monthDay <= '01-02';
}

function nightlyRates(
  checkIn: ISODate,
  checkOut: ISODate,
  def: RoomTypeDef,
): { date: ISODate; rateMinor: number }[] {
  const rates: { date: ISODate; rateMinor: number }[] = [];
  for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
    const weekend =
      def.weekendPriceMinor !== null &&
      (sundayIndex(date) === 5 || sundayIndex(date) === 6);
    let rate = weekend ? def.weekendPriceMinor! : def.basePriceMinor;
    if (isFestive(date)) rate = Math.round(rate * 1.2);
    rates.push({ date, rateMinor: rate });
  }
  return rates;
}

function statusHistory(status: ReservationScenario['status']): {
  from: ReservationScenario['status'] | null;
  to: ReservationScenario['status'];
}[] {
  switch (status) {
    case 'pending':
      return [{ from: null, to: 'pending' }];
    case 'expired':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'expired' },
      ];
    case 'confirmed':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'confirmed' },
      ];
    case 'checked_in':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'confirmed' },
        { from: 'confirmed', to: 'checked_in' },
      ];
    case 'checked_out':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'confirmed' },
        { from: 'confirmed', to: 'checked_in' },
        { from: 'checked_in', to: 'checked_out' },
      ];
    case 'no_show':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'confirmed' },
        { from: 'confirmed', to: 'no_show' },
      ];
    case 'cancelled':
      return [
        { from: null, to: 'pending' },
        { from: 'pending', to: 'confirmed' },
        { from: 'confirmed', to: 'cancelled' },
      ];
  }
}

export interface DemoOptions {
  executor: SeedExecutor;
  now?: Date;
  randomSeed?: string;
}

export async function runDemo(options: DemoOptions): Promise<{
  gallery: number;
  reservations: number;
  enquiries: number;
}> {
  const executor = options.executor;
  const now = options.now ?? new Date();
  const rng = createSeededRandom(options.randomSeed ?? 'quill-demo-2026');

  const [settings] = await executor
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  if (!settings) {
    throw new Error(
      'Hotel settings are missing. Run `pnpm seed:bootstrap` first.',
    );
  }

  const today = hotelClock(now, settings.timezone).today;
  const monthEnd = addDays(startOfMonth(addMonths(today, 1)), -1);

  const amenityRows = await executor
    .select({ id: amenities.id, key: amenities.key })
    .from(amenities);
  const amenityByKey = new Map(amenityRows.map((row) => [row.key, row.id]));

  const images = await generateDemoImages();

  const roomTypeIds = new Map<string, string>();
  const roomIds = new Map<string, string>();
  const roomTypeByNumber = new Map<string, RoomTypeDef>();

  for (const [index, def] of ROOM_TYPE_DEFS.entries()) {
    const roomTypeId = id(`room-type:${def.key}`);
    roomTypeIds.set(def.key, roomTypeId);
    const [inserted] = await executor
      .insert(roomTypes)
      .values({
        id: roomTypeId,
        name: def.name,
        slug: def.slug,
        shortDescription: def.shortDescription,
        description: def.description,
        bedConfig: def.bedConfig,
        maxAdults: def.maxAdults,
        maxChildren: def.maxChildren,
        maxOccupancy: def.maxOccupancy,
        basePriceMinor: def.basePriceMinor,
        weekendPriceMinor: def.weekendPriceMinor,
        sizeSqm: def.sizeSqm,
        floorInfo: index < 2 ? '1' : '2',
        isActive: true,
        isFeatured: def.isFeatured,
        sortOrder: index + 1,
        metaTitle: `${def.name} — demo`,
        metaDescription: def.shortDescription,
        coverImageUrl: def.coverImage,
        coverImageAlt: `${def.name} demo placeholder`,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: roomTypes.id })
      .returning({ id: roomTypes.id });
    if (inserted)
      await recordSeed(executor, 'room_types', roomTypeId, DEMO_SEED);

    for (const room of def.rooms) {
      const roomId = id(`room:${room.number}`);
      roomIds.set(room.number, roomId);
      roomTypeByNumber.set(room.number, def);
      const [insertedRoom] = await executor
        .insert(rooms)
        .values({
          id: roomId,
          roomTypeId,
          roomNumber: room.number,
          floor: room.floor,
          status: 'active',
          isActive: true,
          notes: 'DEMO room',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: rooms.id })
        .returning({ id: rooms.id });
      if (insertedRoom) await recordSeed(executor, 'rooms', roomId, DEMO_SEED);
    }

    for (const amenityKey of def.amenities) {
      const amenityId = amenityByKey.get(amenityKey);
      if (!amenityId) {
        throw new Error(
          `Amenity "${amenityKey}" is missing. Run \`pnpm seed:bootstrap\` first.`,
        );
      }
      const [existing] = await executor
        .select({ roomTypeId: roomTypeAmenities.roomTypeId })
        .from(roomTypeAmenities)
        .where(
          and(
            eq(roomTypeAmenities.roomTypeId, roomTypeId),
            eq(roomTypeAmenities.amenityId, amenityId),
          ),
        )
        .limit(1);
      if (existing) continue;
      await executor.insert(roomTypeAmenities).values({
        roomTypeId,
        amenityId,
        createdAt: now,
      });
      await recordSeed(
        executor,
        'room_type_amenities',
        id(`room-type-amenity:${def.key}:${amenityKey}`),
        DEMO_SEED,
      );
    }
  }

  for (const [index, def] of EXTRA_DEFS.entries()) {
    const extraId = id(`extra:${def.key}`);
    const [inserted] = await executor
      .insert(extras)
      .values({
        id: extraId,
        name: def.name,
        slug: def.slug,
        description: def.description,
        priceMinor: def.priceMinor,
        maxQuantity: def.maxQuantity,
        pricingUnit: def.pricingUnit,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: extras.id })
      .returning({ id: extras.id });
    if (inserted) await recordSeed(executor, 'extras', extraId, DEMO_SEED);
  }

  const longWeekendStart = addDays(
    today,
    14 + ((5 - sundayIndex(today) + 7) % 7),
  );
  const rateRuleDefs = [
    {
      key: 'christmas',
      name: 'DEMO Christmas peak',
      roomTypeKey: null as string | null,
      startDate: `${today.slice(0, 4)}-12-20`,
      endDate: `${String(Number(today.slice(0, 4)) + 1)}-01-02`,
      minNights: 2,
      adjustmentType: 'percent_markup' as const,
      adjustmentValue: 2000,
      priority: 20,
    },
    {
      key: 'long-weekend',
      name: 'DEMO Long weekend',
      roomTypeKey: 'deluxe',
      startDate: longWeekendStart,
      endDate: addDays(longWeekendStart, 3),
      minNights: 2,
      adjustmentType: 'fixed_price' as const,
      adjustmentValue: 70_000_00,
      priority: 30,
    },
    {
      key: 'festive-minimum',
      name: 'DEMO Festive minimum stay',
      roomTypeKey: null as string | null,
      startDate: `${today.slice(0, 4)}-12-23`,
      endDate: `${String(Number(today.slice(0, 4)) + 1)}-01-01`,
      minNights: 3,
      adjustmentType: 'percent_markup' as const,
      adjustmentValue: 1000,
      priority: 15,
    },
  ];

  for (const def of rateRuleDefs) {
    const ruleId = id(`rate-rule:${def.key}`);
    const [inserted] = await executor
      .insert(rateRules)
      .values({
        id: ruleId,
        roomTypeId: def.roomTypeKey ? roomTypeIds.get(def.roomTypeKey)! : null,
        name: def.name,
        startDate: def.startDate,
        endDate: def.endDate,
        minNights: def.minNights,
        adjustmentType: def.adjustmentType,
        adjustmentValue: def.adjustmentValue,
        priority: def.priority,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: rateRules.id })
      .returning({ id: rateRules.id });
    if (inserted) await recordSeed(executor, 'rate_rules', ruleId, DEMO_SEED);
  }

  for (const [index, def] of FACILITY_DEFS.entries()) {
    const facilityId = id(`facility:${def.key}`);
    const [inserted] = await executor
      .insert(facilities)
      .values({
        id: facilityId,
        name: def.name,
        slug: def.slug,
        description: def.description,
        icon: def.icon,
        kind: def.kind,
        openingHours: def.openingHours,
        pricing: def.pricing,
        priceNote: def.priceNote,
        capacity: null,
        layouts: [],
        ctaLabel: 'Enquire',
        ctaTopic: 'general',
        imageUrl: def.image,
        imageAlt: `${def.name} demo placeholder`,
        storageKey: null,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: facilities.id })
      .returning({ id: facilities.id });
    if (inserted)
      await recordSeed(executor, 'facilities', facilityId, DEMO_SEED);
  }

  for (const [index, image] of images.gallery.entries()) {
    const galleryId = id(`gallery:${index}`);
    const roomTypeId =
      image.category === 'rooms'
        ? index === 0
          ? roomTypeIds.get('standard')
          : roomTypeIds.get('deluxe')
        : null;
    const [inserted] = await executor
      .insert(galleryImages)
      .values({
        id: galleryId,
        category: image.category as
          | 'rooms'
          | 'facilities'
          | 'exterior'
          | 'dining'
          | 'events'
          | 'surroundings'
          | 'other',
        title: image.caption,
        altText: image.altText,
        imageUrl: image.url,
        thumbnailUrl: image.thumbnailUrl,
        caption: image.caption,
        roomTypeId,
        facilityId: null,
        width: image.width,
        height: image.height,
        color: image.color,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: galleryImages.id })
      .returning({ id: galleryImages.id });
    if (inserted)
      await recordSeed(executor, 'gallery_images', galleryId, DEMO_SEED);
  }

  for (const [index, def] of FAQ_DEFS.entries()) {
    const faqId = id(`faq:${index}`);
    const [inserted] = await executor
      .insert(faqs)
      .values({
        id: faqId,
        question: def.question,
        answer: def.answer,
        category: def.category,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: faqs.id })
      .returning({ id: faqs.id });
    if (inserted) await recordSeed(executor, 'faqs', faqId, DEMO_SEED);
  }

  for (const [index, def] of TEAM_DEFS.entries()) {
    const teamId = id(`team:${def.key}`);
    const [inserted] = await executor
      .insert(teamMembers)
      .values({
        id: teamId,
        name: def.name,
        role: def.role,
        bio: def.bio,
        email: def.email,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: teamMembers.id })
      .returning({ id: teamMembers.id });
    if (inserted) await recordSeed(executor, 'team_members', teamId, DEMO_SEED);
  }

  for (const [index, def] of ATTRACTION_DEFS.entries()) {
    const attractionId = id(`attraction:${def.key}`);
    const [inserted] = await executor
      .insert(nearbyAttractions)
      .values({
        id: attractionId,
        name: def.name,
        distance: def.distance,
        description: def.description,
        sortOrder: index + 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: nearbyAttractions.id })
      .returning({ id: nearbyAttractions.id });
    if (inserted) {
      await recordSeed(executor, 'nearby_attractions', attractionId, DEMO_SEED);
    }
  }

  for (const [index, def] of TESTIMONIAL_DEFS.entries()) {
    const testimonialId = id(`testimonial:${index}`);
    const [inserted] = await executor
      .insert(testimonials)
      .values({
        id: testimonialId,
        guestName: def.guestName,
        roomTypeId: roomTypeIds.get('deluxe')!,
        location: def.location,
        quote: def.quote,
        rating: def.rating,
        stayType: def.stayType,
        isFeatured: index === 0,
        isActive: true,
        sortOrder: index + 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: testimonials.id })
      .returning({ id: testimonials.id });
    if (inserted) {
      await recordSeed(executor, 'testimonials', testimonialId, DEMO_SEED);
    }
  }

  const staffDefs = [
    {
      key: 'owner',
      email: `demo.owner@${DEMO_GUEST_DOMAIN}`,
      firstName: 'Demo',
      lastName: 'Owner',
      role: 'owner' as const,
      env: 'DEMO_OWNER_PASSWORD',
    },
    {
      key: 'manager',
      email: `demo.manager@${DEMO_GUEST_DOMAIN}`,
      firstName: 'Demo',
      lastName: 'Manager',
      role: 'manager' as const,
      env: 'DEMO_MANAGER_PASSWORD',
    },
    {
      key: 'reception',
      email: `demo.reception@${DEMO_GUEST_DOMAIN}`,
      firstName: 'Demo',
      lastName: 'Reception',
      role: 'reception' as const,
      env: 'DEMO_RECEPTION_PASSWORD',
    },
  ];

  const staffIds = new Map<string, string>();
  for (const def of staffDefs) {
    const staffId = id(`staff:${def.key}`);
    staffIds.set(def.key, staffId);
    const password = requiredEnv(def.env);
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(`${def.env}: ${passwordError}`);
    const passwordHash = await hashPassword(password);
    const [inserted] = await executor
      .insert(staffUsers)
      .values({
        id: staffId,
        email: def.email,
        passwordHash,
        firstName: def.firstName,
        lastName: def.lastName,
        role: def.role,
        phone: '+2348000000000',
        isActive: true,
        mfaEnabled: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: staffUsers.id })
      .returning({ id: staffUsers.id });
    if (inserted) await recordSeed(executor, 'staff_users', staffId, DEMO_SEED);
  }
  const managerId = staffIds.get('manager')!;
  const receptionId = staffIds.get('reception')!;

  const blockId = id('room-block:maintenance');
  const [insertedBlock] = await executor
    .insert(roomBlocks)
    .values({
      id: blockId,
      roomId: roomIds.get('106')!,
      startDate: addDays(today, 33),
      endDate: addDays(today, 35),
      reason: 'maintenance',
      notes: 'DEMO maintenance block',
      createdBy: managerId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: roomBlocks.id })
    .returning({ id: roomBlocks.id });
  if (insertedBlock)
    await recordSeed(executor, 'room_blocks', blockId, DEMO_SEED);

  const scenarios: ReservationScenario[] = [
    {
      key: 'in-house',
      roomNumber: '101',
      checkIn: addDays(today, -2),
      checkOut: addDays(today, 1),
      status: 'checked_in',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'full',
      guestName: 'Ada Demo',
      guestEmail: `ada.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000001',
      adults: 2,
      children: 0,
      extraKeys: ['breakfast'],
    },
    {
      key: 'upcoming-deposit',
      roomNumber: '102',
      checkIn: addDays(today, 2),
      checkOut: addDays(today, 5),
      status: 'confirmed',
      paymentMode: 'deposit_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'deposit',
      guestName: 'Tunde Sample',
      guestEmail: `tunde.sample@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000002',
      adults: 2,
      children: 0,
      extraKeys: ['airport-pickup'],
    },
    {
      key: 'upcoming-paid',
      roomNumber: '103',
      checkIn: addDays(today, 10),
      checkOut: addDays(today, 13),
      status: 'confirmed',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'admin',
      payment: 'full',
      guestName: 'Chioma Example',
      guestEmail: `chioma.example@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000003',
      adults: 2,
      children: 1,
      extraKeys: ['breakfast', 'housekeeping'],
    },
    {
      key: 'pending-approval',
      roomNumber: '104',
      checkIn: addDays(today, 20),
      checkOut: addDays(today, 22),
      status: 'pending',
      paymentMode: 'pay_at_hotel',
      confirmationMode: 'manual_approval',
      bookingSource: 'website',
      payment: 'none',
      guestName: 'Ngozi Demo',
      guestEmail: `ngozi.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000004',
      adults: 1,
      children: 0,
      notes: 'DEMO request awaiting approval',
    },
    {
      key: 'pending-transfer',
      roomNumber: '105',
      checkIn: addDays(today, 25),
      checkOut: addDays(today, 28),
      status: 'pending',
      paymentMode: 'full_online',
      confirmationMode: 'manual_approval',
      bookingSource: 'website',
      payment: 'pending_transfer',
      guestName: 'Emeka Sample',
      guestEmail: `emeka.sample@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000005',
      adults: 2,
      children: 0,
      notes: 'DEMO bank transfer proof uploaded',
    },
    {
      key: 'pending-failed',
      roomNumber: '106',
      checkIn: addDays(today, 30),
      checkOut: addDays(today, 32),
      status: 'pending',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'failed',
      guestName: 'Bola Demo',
      guestEmail: `bola.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000006',
      adults: 2,
      children: 0,
      notes: 'DEMO card payment failed',
    },
    {
      key: 'pending-expired',
      roomNumber: '107',
      checkIn: addDays(today, -1),
      checkOut: addDays(today, 1),
      status: 'pending',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'none',
      guestName: 'Kemi Example',
      guestEmail: `kemi.example@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000007',
      adults: 1,
      children: 0,
      holdExpired: true,
    },
    {
      key: 'month-end',
      roomNumber: '201',
      checkIn: addDays(monthEnd, -1),
      checkOut: addDays(monthEnd, 1),
      status: 'confirmed',
      paymentMode: 'deposit_online',
      confirmationMode: 'instant',
      bookingSource: 'phone',
      payment: 'deposit',
      guestName: 'Ifeanyi Demo',
      guestEmail: `ifeanyi.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000008',
      adults: 2,
      children: 2,
      extraKeys: ['breakfast'],
    },
    {
      key: 'long-stay',
      roomNumber: '202',
      checkIn: addDays(today, -10),
      checkOut: addDays(today, 5),
      status: 'checked_in',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'admin',
      payment: 'full',
      guestName: 'Zainab Sample',
      guestEmail: `zainab.sample@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000009',
      adults: 1,
      children: 0,
      notes: 'DEMO long stay',
    },
    {
      key: 'same-day-turnover',
      roomNumber: '104',
      checkIn: today,
      checkOut: addDays(today, 2),
      status: 'confirmed',
      paymentMode: 'pay_at_hotel',
      confirmationMode: 'instant',
      bookingSource: 'walk_in',
      payment: 'none',
      guestName: 'Musa Demo',
      guestEmail: `musa.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000010',
      adults: 1,
      children: 0,
      notes: 'DEMO same-day turnover arrival',
    },
    {
      key: 'cancelled-upcoming',
      roomNumber: '201',
      checkIn: addDays(today, 40),
      checkOut: addDays(today, 42),
      status: 'cancelled',
      paymentMode: 'pay_at_hotel',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'none',
      guestName: 'Halima Example',
      guestEmail: `halima.example@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000011',
      adults: 2,
      children: 0,
      cancellationReason: 'DEMO guest changed plans',
    },
    {
      key: 'cancelled-refunded',
      roomNumber: '202',
      checkIn: addDays(today, 50),
      checkOut: addDays(today, 53),
      status: 'cancelled',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'refund_paid',
      guestName: 'Femi Demo',
      guestEmail: `femi.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000012',
      adults: 2,
      children: 0,
      cancellationReason: 'DEMO cancellation with processed refund',
    },
    {
      key: 'cancelled-manual-refund',
      roomNumber: '203',
      checkIn: addDays(today, -20),
      checkOut: addDays(today, -18),
      status: 'cancelled',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'refund_manual',
      guestName: 'Amaka Sample',
      guestEmail: `amaka.sample@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000013',
      adults: 2,
      children: 0,
      cancellationReason: 'DEMO manual refund still pending',
    },
    {
      key: 'checked-out',
      roomNumber: '204',
      checkIn: addDays(today, -15),
      checkOut: addDays(today, -12),
      status: 'checked_out',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'phone',
      payment: 'full',
      guestName: 'Sade Demo',
      guestEmail: `sade.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000014',
      adults: 2,
      children: 1,
      extraKeys: ['breakfast'],
    },
    {
      key: 'same-day-turnover-out',
      roomNumber: '104',
      checkIn: addDays(today, -3),
      checkOut: today,
      status: 'checked_out',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'full',
      guestName: 'Uche Example',
      guestEmail: `uche.example@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000015',
      adults: 1,
      children: 0,
      notes: 'DEMO same-day turnover departure',
    },
    {
      key: 'no-show',
      roomNumber: '205',
      checkIn: addDays(today, -5),
      checkOut: addDays(today, -3),
      status: 'no_show',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'full',
      guestName: 'Yemi Demo',
      guestEmail: `yemi.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000016',
      adults: 1,
      children: 0,
    },
    {
      key: 'far-future',
      roomNumber: '206',
      checkIn: addDays(today, 60),
      checkOut: addDays(today, 63),
      status: 'confirmed',
      paymentMode: 'deposit_online',
      confirmationMode: 'instant',
      bookingSource: 'website',
      payment: 'deposit',
      guestName: 'Ibrahim Sample',
      guestEmail: `ibrahim.sample@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000017',
      adults: 2,
      children: 0,
      extraKeys: ['airport-pickup'],
    },
    {
      key: 'second-approval',
      roomNumber: '207',
      checkIn: addDays(today, 70),
      checkOut: addDays(today, 72),
      status: 'pending',
      paymentMode: 'pay_at_hotel',
      confirmationMode: 'manual_approval',
      bookingSource: 'website',
      payment: 'none',
      guestName: 'Grace Demo',
      guestEmail: `grace.demo@${DEMO_GUEST_DOMAIN}`,
      guestPhone: '+2348010000018',
      adults: 2,
      children: 1,
      notes: 'DEMO group enquiry awaiting approval',
    },
  ];

  const reservationIds = new Map<string, string>();
  const extraIds = new Map(
    EXTRA_DEFS.map((def) => [def.key, id(`extra:${def.key}`)]),
  );

  for (const [index, scenario] of scenarios.entries()) {
    const reservationId = id(`reservation:${scenario.key}`);
    reservationIds.set(scenario.key, reservationId);
    const def = roomTypeByNumber.get(scenario.roomNumber)!;
    const roomTypeId = roomTypeIds.get(def.key)!;
    const roomId = roomIds.get(scenario.roomNumber)!;
    const rates = nightlyRates(scenario.checkIn, scenario.checkOut, def);
    const nights = nightsBetween(scenario.checkIn, scenario.checkOut);
    const subtotalMinor = rates.reduce((sum, rate) => sum + rate.rateMinor, 0);

    let extrasMinor = 0;
    const extraRows = (scenario.extraKeys ?? []).map((key) => {
      const extraDef = EXTRA_DEFS.find((item) => item.key === key)!;
      const quantity =
        extraDef.pricingUnit === 'per_night'
          ? nights
          : extraDef.pricingUnit === 'per_guest_per_night'
            ? nights * scenario.adults
            : 1;
      const totalMinor = extraDef.priceMinor * quantity;
      extrasMinor += totalMinor;
      return {
        extraId: extraIds.get(key)!,
        name: extraDef.name,
        quantity,
        unitPriceMinor: extraDef.priceMinor,
        totalMinor,
        pricingUnit: extraDef.pricingUnit,
      };
    });

    const totalMinor = subtotalMinor + extrasMinor;
    const depositRequiredMinor =
      scenario.paymentMode === 'deposit_online'
        ? Math.round(totalMinor * 0.3)
        : 0;

    let amountPaidMinor = 0;
    let amountRefundedMinor = 0;
    let balanceMinor = totalMinor;
    if (
      scenario.payment === 'full' ||
      scenario.payment === 'refund_paid' ||
      scenario.payment === 'refund_manual'
    ) {
      amountPaidMinor = totalMinor;
      balanceMinor = 0;
    } else if (scenario.payment === 'deposit') {
      amountPaidMinor = depositRequiredMinor;
      balanceMinor = totalMinor - depositRequiredMinor;
    }
    if (scenario.payment === 'refund_paid') {
      amountRefundedMinor = Math.round(totalMinor * 0.5);
    }
    if (scenario.status === 'cancelled' || scenario.status === 'no_show') {
      balanceMinor = 0;
    }

    const createdAt =
      scenario.status === 'checked_out' || scenario.status === 'no_show'
        ? addDaysToDateLocal(now, -25)
        : addDaysToDateLocal(now, -5);
    const confirmed = [
      'confirmed',
      'checked_in',
      'checked_out',
      'no_show',
      'cancelled',
    ].includes(scenario.status);
    const checkedIn = ['checked_in', 'checked_out'].includes(scenario.status);

    const [inserted] = await executor
      .insert(reservations)
      .values({
        id: reservationId,
        reference: `DEMO-${String(index + 1).padStart(4, '0')}`,
        roomId,
        roomTypeId,
        guestName: scenario.guestName,
        guestEmail: scenario.guestEmail,
        guestEmailMissing: false,
        guestPhone: scenario.guestPhone,
        guestCountry: 'NG',
        arrivalTime: `${rng.int(13, 18)}:00`,
        specialRequests: scenario.notes ?? null,
        checkIn: scenario.checkIn,
        checkOut: scenario.checkOut,
        adults: scenario.adults,
        children: scenario.children,
        nights,
        status: scenario.status,
        bookingSource: scenario.bookingSource,
        paymentMode: scenario.paymentMode,
        confirmationMode: scenario.confirmationMode,
        channel: scenario.bookingSource === 'website' ? 'web' : 'admin',
        subtotalMinor,
        extrasMinor,
        discountMinor: 0,
        taxMinor: 0,
        serviceChargeMinor: 0,
        totalMinor,
        depositRequiredMinor,
        amountPaidMinor,
        amountRefundedMinor,
        balanceMinor,
        currency: 'NGN',
        holdExpiresAt:
          scenario.status === 'pending'
            ? scenario.holdExpired
              ? addMinutesLocal(now, -30)
              : addMinutesLocal(now, 30)
            : null,
        termsAcceptedAt: createdAt,
        termsAcceptedIp: DEMO_IP,
        staffTermsAccepted: scenario.bookingSource !== 'website',
        confirmedAt: confirmed ? addDaysToDateLocal(createdAt, 1) : null,
        confirmedBy: confirmed ? managerId : null,
        checkedInAt: checkedIn ? atUtcLocal(scenario.checkIn, 14) : null,
        checkedOutAt:
          scenario.status === 'checked_out'
            ? atUtcLocal(scenario.checkOut, 11)
            : null,
        cancelledAt:
          scenario.status === 'cancelled'
            ? addDaysToDateLocal(createdAt, 2)
            : null,
        cancellationReason: scenario.cancellationReason ?? null,
        changeCount: 0,
        snapshot: { seed: DEMO_SEED, scenario: scenario.key },
        notes: scenario.notes ?? null,
        createdAt,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: reservations.id })
      .returning({ id: reservations.id });

    if (!inserted) continue;
    await recordSeed(executor, 'reservations', reservationId, DEMO_SEED);

    for (const rate of rates) {
      const nightId = id(`reservation-night:${scenario.key}:${rate.date}`);
      await executor.insert(reservationNights).values({
        id: nightId,
        reservationId,
        date: rate.date,
        rateMinor: rate.rateMinor,
        createdAt,
      });
      await recordSeed(executor, 'reservation_nights', nightId, DEMO_SEED);
    }

    for (const extra of extraRows) {
      const reservationExtraId = id(
        `reservation-extra:${scenario.key}:${extra.name}`,
      );
      await executor.insert(reservationExtras).values({
        id: reservationExtraId,
        reservationId,
        extraId: extra.extraId,
        name: extra.name,
        quantity: extra.quantity,
        unitPriceMinor: extra.unitPriceMinor,
        totalMinor: extra.totalMinor,
        pricingUnit: extra.pricingUnit,
        createdAt,
      });
      await recordSeed(
        executor,
        'reservation_extras',
        reservationExtraId,
        DEMO_SEED,
      );
    }

    const transitions = statusHistory(scenario.status);
    for (const [transitionIndex, transition] of transitions.entries()) {
      const historyId = id(
        `reservation-history:${scenario.key}:${transitionIndex}`,
      );
      await executor.insert(reservationStatusHistory).values({
        id: historyId,
        reservationId,
        fromStatus: transition.from,
        toStatus: transition.to,
        reason:
          transition.to === 'cancelled'
            ? (scenario.cancellationReason ?? 'DEMO cancellation')
            : 'DEMO seed transition',
        changedBy:
          transition.to === 'pending' || transition.to === 'expired'
            ? null
            : managerId,
        metadata: { seed: DEMO_SEED },
        createdAt: addDaysToDateLocal(createdAt, transitionIndex),
      });
      await recordSeed(
        executor,
        'reservation_status_history',
        historyId,
        DEMO_SEED,
      );
    }

    const paymentBase = {
      reservationId,
      currency: 'NGN',
      feeMinor: 0,
      netAmountMinor: null,
      providerResponse: { seed: DEMO_SEED },
      channel: 'card',
      ipAddress: DEMO_IP,
      reconciled: false,
      reconciledAt: null,
      reconciledBy: null,
      note: 'DEMO payment',
      createdAt,
      updatedAt: now,
    };

    if (
      scenario.payment === 'full' ||
      scenario.payment === 'deposit' ||
      scenario.payment === 'refund_paid' ||
      scenario.payment === 'refund_manual'
    ) {
      const paymentId = id(`payment:${scenario.key}:charge`);
      const amount =
        scenario.payment === 'deposit' ? depositRequiredMinor : totalMinor;
      await executor.insert(payments).values({
        ...paymentBase,
        id: paymentId,
        reference: `DEMO-PAY-${String(index + 1).padStart(4, '0')}`,
        provider: 'paystack',
        type: scenario.payment === 'deposit' ? 'deposit' : 'full',
        status: 'paid',
        amountMinor: amount,
        providerRef: `demo_provider_${index + 1}`,
        paidAt: addDaysToDateLocal(createdAt, 1),
      });
      await recordSeed(executor, 'payments', paymentId, DEMO_SEED);

      if (scenario.payment === 'refund_paid') {
        const refundPaymentId = id(`payment:${scenario.key}:refund`);
        await executor.insert(payments).values({
          ...paymentBase,
          id: refundPaymentId,
          reference: `DEMO-PAY-${String(index + 1).padStart(4, '0')}-R`,
          provider: 'paystack',
          type: 'refund',
          status: 'paid',
          amountMinor: amountRefundedMinor,
          refundOfPaymentId: paymentId,
          providerRef: `demo_refund_${index + 1}`,
          paidAt: addDaysToDateLocal(createdAt, 3),
        });
        await recordSeed(executor, 'payments', refundPaymentId, DEMO_SEED);
        await executor.insert(refunds).values({
          id: id(`refund:${scenario.key}`),
          reservationId,
          paymentId: refundPaymentId,
          amountMinor: amountRefundedMinor,
          method: 'paystack',
          status: 'processed',
          timeline: '5-10 business days',
          reason: scenario.cancellationReason,
          providerRef: `demo_refund_${index + 1}`,
          createdAt: addDaysToDateLocal(createdAt, 3),
          processedAt: addDaysToDateLocal(createdAt, 3),
        });
        await recordSeed(
          executor,
          'refunds',
          id(`refund:${scenario.key}`),
          DEMO_SEED,
        );
      }

      if (scenario.payment === 'refund_manual') {
        const refundPaymentId = id(`payment:${scenario.key}:refund`);
        await executor.insert(payments).values({
          ...paymentBase,
          id: refundPaymentId,
          reference: `DEMO-PAY-${String(index + 1).padStart(4, '0')}-R`,
          provider: 'bank_transfer',
          type: 'refund',
          status: 'pending',
          amountMinor: Math.round(totalMinor * 0.5),
          refundOfPaymentId: paymentId,
          channel: 'bank_transfer',
          note: 'DEMO manual refund pending',
        });
        await recordSeed(executor, 'payments', refundPaymentId, DEMO_SEED);
        await executor.insert(refunds).values({
          id: id(`refund:${scenario.key}`),
          reservationId,
          paymentId: refundPaymentId,
          amountMinor: Math.round(totalMinor * 0.5),
          method: 'bank_transfer',
          status: 'pending_manual',
          timeline: 'Awaiting manual processing',
          reason: scenario.cancellationReason,
          createdAt: addDaysToDateLocal(createdAt, 3),
        });
        await recordSeed(
          executor,
          'refunds',
          id(`refund:${scenario.key}`),
          DEMO_SEED,
        );
      }
    }

    if (scenario.payment === 'pending_transfer') {
      const paymentId = id(`payment:${scenario.key}:charge`);
      await executor.insert(payments).values({
        ...paymentBase,
        id: paymentId,
        reference: `DEMO-PAY-${String(index + 1).padStart(4, '0')}`,
        provider: 'bank_transfer',
        type: 'full',
        status: 'pending',
        amountMinor: totalMinor,
        channel: 'bank_transfer',
        note: 'DEMO awaiting transfer verification',
      });
      await recordSeed(executor, 'payments', paymentId, DEMO_SEED);
      const proofId = id(`payment-proof:${scenario.key}`);
      await executor.insert(paymentProofs).values({
        id: proofId,
        paymentId,
        storageKey: images.proof.storageKey,
        mimeType: images.proof.mimeType,
        sizeBytes: images.proof.sizeBytes,
        uploadedAt: addDaysToDateLocal(createdAt, 1),
      });
      await recordSeed(executor, 'payment_proofs', proofId, DEMO_SEED);
    }

    if (scenario.payment === 'failed') {
      const failedPaymentId = id(`payment:${scenario.key}:charge`);
      await executor.insert(payments).values({
        ...paymentBase,
        id: failedPaymentId,
        reference: `DEMO-PAY-${String(index + 1).padStart(4, '0')}`,
        provider: 'paystack',
        type: 'full',
        status: 'failed',
        amountMinor: totalMinor,
        providerRef: `demo_failed_${index + 1}`,
        failedAt: addDaysToDateLocal(createdAt, 1),
      });
      await recordSeed(executor, 'payments', failedPaymentId, DEMO_SEED);
    }
  }

  const reservationFor = (key: string) => reservationIds.get(key)!;

  interface EnquiryDef {
    key: string;
    type:
      | 'booking_enquiry'
      | 'general'
      | 'group_booking'
      | 'event_conference'
      | 'corporate'
      | 'complaint_feedback';
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    status: 'new' | 'replied' | 'closed' | 'converted';
    isSpam: boolean;
    createdAt: Date;
    reply?: string;
    note?: string;
    converted?: string;
  }

  const enquiryDefs: EnquiryDef[] = [
    {
      key: 'general',
      type: 'general' as const,
      name: 'Demo Enquiry',
      email: `enquiry.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000001',
      subject: 'Demo general enquiry',
      message: 'This is a demo general enquiry for local development.',
      status: 'new' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -1),
    },
    {
      key: 'booking',
      type: 'booking_enquiry' as const,
      name: 'Demo Booking Enquiry',
      email: `booking.enquiry@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000002',
      subject: 'Demo booking enquiry',
      message: 'This is a demo booking enquiry for local development.',
      status: 'replied' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -3),
      reply: 'This is a demo reply.',
    },
    {
      key: 'group',
      type: 'group_booking' as const,
      name: 'Demo Group',
      email: `group.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000003',
      subject: 'Demo group booking',
      message: 'This is a demo group booking enquiry.',
      status: 'converted' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -7),
      converted: reservationFor('upcoming-paid'),
    },
    {
      key: 'event',
      type: 'event_conference' as const,
      name: 'Demo Events',
      email: `events.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000004',
      subject: 'Demo event enquiry',
      message: 'This is a demo event and conference enquiry.',
      status: 'closed' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -10),
      note: 'Demo note: event enquiry closed.',
    },
    {
      key: 'corporate',
      type: 'corporate' as const,
      name: 'Demo Corporate',
      email: `enquiry.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000005',
      subject: 'Demo corporate enquiry',
      message: 'This is a demo corporate enquiry.',
      status: 'new' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -30),
    },
    {
      key: 'complaint',
      type: 'complaint_feedback' as const,
      name: 'Demo Feedback',
      email: `feedback.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000006',
      subject: 'Demo complaint',
      message: 'This is a demo complaint and feedback enquiry.',
      status: 'closed' as const,
      isSpam: false,
      createdAt: addDaysToDateLocal(now, -15),
    },
    {
      key: 'spam',
      type: 'general' as const,
      name: 'Demo Spam',
      email: `spam.demo@${DEMO_GUEST_DOMAIN}`,
      phone: '+2348020000007',
      subject: 'Demo spam',
      message: 'This is a demo spam enquiry.',
      status: 'new' as const,
      isSpam: true,
      createdAt: addDaysToDateLocal(now, -2),
    },
  ];

  const enquiryIds = new Map<string, string>();
  for (const def of enquiryDefs) {
    const enquiryId = id(`enquiry:${def.key}`);
    enquiryIds.set(def.key, enquiryId);
    const [inserted] = await executor
      .insert(enquiries)
      .values({
        id: enquiryId,
        type: def.type,
        name: def.name,
        email: def.email,
        phone: def.phone,
        subject: def.subject,
        message: def.message,
        status: def.status,
        source: 'website',
        ipAddress: DEMO_IP,
        userAgent: 'DEMO seed',
        isSpam: def.isSpam,
        readAt: def.status === 'new' ? null : def.createdAt,
        assignedTo: def.status === 'new' || def.isSpam ? null : receptionId,
        reservationId: null,
        convertedReservationId: def.converted ?? null,
        createdAt: def.createdAt,
        updatedAt: def.createdAt,
      })
      .onConflictDoNothing({ target: enquiries.id })
      .returning({ id: enquiries.id });
    if (!inserted) continue;
    await recordSeed(executor, 'enquiries', enquiryId, DEMO_SEED);

    if (def.reply) {
      const replyId = id(`enquiry-reply:${def.key}`);
      await executor.insert(enquiryReplies).values({
        id: replyId,
        enquiryId,
        staffUserId: receptionId,
        sentBy: receptionId,
        channel: 'email',
        message: def.reply,
        sentVia: 'email',
        createdAt: addDaysToDateLocal(def.createdAt, 1),
      });
      await recordSeed(executor, 'enquiry_replies', replyId, DEMO_SEED);
    }
    if (def.note) {
      const noteId = id(`enquiry-note:${def.key}`);
      await executor.insert(enquiryNotes).values({
        id: noteId,
        enquiryId,
        staffUserId: receptionId,
        createdBy: receptionId,
        note: def.note,
        body: def.note,
        createdAt: addDaysToDateLocal(def.createdAt, 1),
      });
      await recordSeed(executor, 'enquiry_notes', noteId, DEMO_SEED);
    }
  }

  const webhookDefs = [
    {
      key: 'processed',
      eventId: 'demo-event-1',
      eventType: 'charge.success',
      processed: true,
    },
    {
      key: 'unprocessed',
      eventId: 'demo-event-1',
      eventType: 'charge.success',
      processed: false,
    },
    {
      key: 'failed',
      eventId: 'demo-event-2',
      eventType: 'charge.failed',
      processed: true,
    },
  ];
  for (const def of webhookDefs) {
    const webhookId = id(`webhook:${def.key}`);
    const [inserted] = await executor
      .insert(paymentWebhookEvents)
      .values({
        id: webhookId,
        provider: 'paystack',
        eventId: def.eventId,
        eventType: def.eventType,
        payload: { seed: DEMO_SEED, event: def.eventId },
        headers: { 'x-demo': 'true' },
        processed: def.processed,
        processedAt: def.processed ? addDaysToDateLocal(now, -1) : null,
        error: def.key === 'failed' ? 'DEMO processing error' : null,
        createdAt: addDaysToDateLocal(now, -1),
      })
      .onConflictDoNothing({ target: paymentWebhookEvents.id })
      .returning({ id: paymentWebhookEvents.id });
    if (inserted) {
      await recordSeed(
        executor,
        'payment_webhook_events',
        webhookId,
        DEMO_SEED,
      );
    }
  }

  const notificationDefs = [
    {
      key: 'sent',
      reservationKey: 'upcoming-paid',
      status: 'sent' as const,
      attempts: 1,
    },
    {
      key: 'failed',
      reservationKey: 'pending-failed',
      status: 'failed' as const,
      attempts: 3,
    },
    {
      key: 'queued',
      reservationKey: 'pending-approval',
      status: 'queued' as const,
      attempts: 0,
    },
  ];
  for (const def of notificationDefs) {
    const logId = id(`notification-log:${def.key}`);
    const [inserted] = await executor
      .insert(notificationLogs)
      .values({
        id: logId,
        reservationId: reservationFor(def.reservationKey),
        templateKey: 'booking_confirmation',
        channel: 'email',
        recipient: `notification.demo@${DEMO_GUEST_DOMAIN}`,
        subject: 'DEMO notification',
        body: 'This is a demo notification body.',
        status: def.status,
        attempts: def.attempts,
        lastAttemptAt: def.attempts > 0 ? addDaysToDateLocal(now, -1) : null,
        sentAt: def.status === 'sent' ? addDaysToDateLocal(now, -1) : null,
        error: def.status === 'failed' ? 'DEMO notification failure' : null,
        providerResponse: { seed: DEMO_SEED },
        dedupeKey: `demo-notification-${def.key}`,
        createdAt: addDaysToDateLocal(now, -1),
      })
      .onConflictDoNothing({ target: notificationLogs.id })
      .returning({ id: notificationLogs.id });
    if (inserted) {
      await recordSeed(executor, 'notification_logs', logId, DEMO_SEED);
    }
  }

  return {
    gallery: images.gallery.length,
    reservations: reservationIds.size,
    enquiries: enquiryIds.size,
  };
}

function addDaysToDateLocal(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function addMinutesLocal(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function atUtcLocal(isoDate: ISODate, hour: number): Date {
  return new Date(`${isoDate}T${String(hour).padStart(2, '0')}:00:00.000Z`);
}

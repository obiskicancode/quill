import type {
  Amenity,
  AmenityKey,
  ImageAsset,
  Room,
  Testimonial,
} from '@/types/site.types';

/*
 * PLACEHOLDER CONTENT. In production these arrays come from the database.
 * Prices, facilities and quotes below are samples: replace them before launch.
 */

export const amenityLabels: Record<AmenityKey, string> = {
  wifi: 'Wi-Fi',
  parking: 'Parking',
  restaurant: 'Restaurant',
  pool: 'Pool',
  power: '24-hour power',
  security: 'Security',
  conference: 'Conference hall',
  airport: 'Airport pickup',
  ac: 'Air conditioning',
  tv: 'TV',
  kitchen: 'Kitchen',
  breakfast: 'Breakfast',
  laundry: 'Laundry',
  workdesk: 'Work desk',
};

export const featuredAmenities: Amenity[] = [
  {
    key: 'wifi',
    label: 'Wi-Fi',
    description: 'Stay connected in your room and common areas.',
  },
  { key: 'parking', label: 'Parking', description: 'Secure on-site parking.' },
  {
    key: 'restaurant',
    label: 'Restaurant',
    description: 'Meals and drinks without leaving the building.',
  },
  {
    key: 'pool',
    label: 'Pool',
    description: 'A place to unwind after a long day.',
  },
  {
    key: 'power',
    label: '24-hour power',
    description: 'Work and cooling carry on through the night.',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Round-the-clock security on site.',
  },
  {
    key: 'conference',
    label: 'Conference hall',
    description: 'Space for meetings, training and small events.',
  },
  {
    key: 'airport',
    label: 'Airport pickup',
    description: 'Arranged on request. Ask when you book.',
  },
];

const roomImages = (slug: string, count: number, name: string): ImageAsset[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `/images/rooms/${slug}-${i + 1}.webp`,
    alt: `${name}, photo ${i + 1} of ${count}`,
  }));

export const featuredRooms: Room[] = [
  {
    id: 'room-classic',
    slug: 'classic-room',
    name: 'Classic Room',
    bedType: '1 queen bed',
    maxGuests: 2,
    amenities: ['ac', 'wifi', 'tv'],
    priceNgn: 45000,
    priceHidden: false,
    secondaryPrice: { currency: 'USD', amount: 30 },
    images: roomImages('classic', 3, 'Classic Room'),
  },
  {
    id: 'room-deluxe',
    slug: 'deluxe-room',
    name: 'Deluxe Room',
    bedType: '1 king bed',
    maxGuests: 2,
    amenities: ['ac', 'workdesk', 'wifi'],
    priceNgn: 65000,
    priceHidden: false,
    images: roomImages('deluxe', 4, 'Deluxe Room'),
  },
  {
    id: 'room-one-bed',
    slug: 'one-bedroom-apartment',
    name: 'One-Bedroom Apartment with Lounge',
    bedType: '1 king bed and sofa bed',
    maxGuests: 3,
    amenities: ['kitchen', 'ac', 'wifi'],
    priceNgn: 95000,
    priceHidden: false,
    images: roomImages('one-bed', 3, 'One-Bedroom Apartment'),
  },
  {
    id: 'room-family',
    slug: 'family-apartment',
    name: 'Family Apartment',
    bedType: '2 double beds',
    maxGuests: 5,
    amenities: ['kitchen', 'ac', 'tv'],
    priceNgn: null,
    priceHidden: true,
    images: roomImages('family', 3, 'Family Apartment'),
  },
];

const gallerySrc = (n: number) => `/images/gallery/g-${n}.webp`;

export const galleryPreview: ImageAsset[] = [
  {
    src: gallerySrc(1),
    alt: 'A guest room with a made bed and a reading lamp',
  },
  { src: gallerySrc(2), alt: 'The reception desk and lobby' },
  { src: gallerySrc(3), alt: 'The pool area in the evening' },
  { src: gallerySrc(4), alt: 'A breakfast table set in the restaurant' },
  { src: gallerySrc(5), alt: 'The conference hall set up for a meeting' },
  { src: gallerySrc(6), alt: 'The building exterior and parking area' },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote:
      '[Sample quote] The room was quiet, the power never dropped, and check-in took two minutes.',
    guestName: 'Chidinma O.',
    stayType: 'Business trip',
    rating: 5,
  },
  {
    id: 't2',
    quote:
      '[Sample quote] We booked a family apartment for the weekend. The kids had space and we could cook.',
    guestName: 'Tunde A.',
    stayType: 'Family stay',
    rating: 5,
  },
  {
    id: 't3',
    quote:
      '[Sample quote] Our team stayed here for a three-day conference. Easy to organise and well looked after.',
    guestName: 'Hauwa M.',
    stayType: 'Conference guest',
    rating: 4,
  },
  {
    id: 't4',
    quote:
      '[Sample quote] A calm place for a short anniversary break. The staff were kind and quick to help.',
    guestName: 'Emeka N.',
    stayType: "Couple's getaway",
  },
];

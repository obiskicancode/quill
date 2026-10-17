import { amenityLabels } from './data'
import type { AmenityKey, ImageAsset } from './types'

/*
 * PLACEHOLDER CONTENT. In production these come from the database.
 * Prices, sizes and policies below are samples: replace them before launch.
 */

export type RoomAmenityKey = AmenityKey | 'kitchenette' | 'balcony'
export type BedType = 'queen' | 'king' | 'twin' | 'double'

export interface ExtraBed {
  available: boolean
  /** 0 means free. null when not available. */
  feeNgn: number | null
}

export interface RoomType {
  id: string
  slug: string
  name: string
  description: string
  bedConfig: string
  bedType: BedType
  sizeSqm: number
  maxAdults: number
  maxChildren: number
  extraBed: ExtraBed
  basePriceNgn: number
  /** Applied to Friday and Saturday nights. */
  weekendPriceNgn: number | null
  /** false when the hotel hides the price ("Contact us for price"). */
  showPrice: boolean
  breakfastIncluded: boolean
  taxesIncluded: boolean
  minStayNights: number
  popular: boolean
  amenities: RoomAmenityKey[]
  /** 1 to 8 images. */
  images: ImageAsset[]
}

export const roomAmenityLabels: Record<RoomAmenityKey, string> = {
  ...amenityLabels,
  kitchenette: 'Kitchenette',
  balcony: 'Balcony',
}

export const bedTypeLabels: Record<BedType, string> = {
  queen: 'Queen bed',
  king: 'King bed',
  twin: 'Twin beds',
  double: 'Double beds',
}

export type FilterAmenity = 'ac' | 'wifi' | 'kitchenette' | 'balcony' | 'breakfast'

export const filterAmenityOptions: { key: FilterAmenity; label: string }[] = [
  { key: 'ac', label: 'Air conditioning' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'kitchenette', label: 'Kitchenette' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'breakfast', label: 'Breakfast included' },
]

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'capacity'

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-asc', label: 'Price low to high' },
  { key: 'price-desc', label: 'Price high to low' },
  { key: 'capacity', label: 'Capacity' },
]

export interface RoomFilters {
  minPrice: number | null
  maxPrice: number | null
  minGuests: number | null
  beds: BedType[]
  amenities: FilterAmenity[]
}

export const emptyFilters: RoomFilters = { minPrice: null, maxPrice: null, minGuests: null, beds: [], amenities: [] }

export const maxGuests = (room: RoomType) => room.maxAdults + room.maxChildren

export function countActiveFilters(f: RoomFilters): number {
  return (
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.minGuests !== null ? 1 : 0) +
    f.beds.length +
    f.amenities.length
  )
}

/** Rooms whose price is hidden always pass the price filter, because the hotel has not published a number to compare. */
export function matchesFilters(room: RoomType, f: RoomFilters): boolean {
  if (room.showPrice) {
    if (f.minPrice !== null && room.basePriceNgn < f.minPrice) return false
    if (f.maxPrice !== null && room.basePriceNgn > f.maxPrice) return false
  }
  if (f.minGuests !== null && maxGuests(room) < f.minGuests) return false
  if (f.beds.length > 0 && !f.beds.includes(room.bedType)) return false
  return f.amenities.every((key) =>
    key === 'breakfast' ? room.breakfastIncluded : room.amenities.includes(key),
  )
}

/** Hidden-price rooms go last when sorting by price. */
export function sortRooms(rooms: RoomType[], sort: SortKey): RoomType[] {
  const list = [...rooms]
  const price = (r: RoomType) => (r.showPrice ? r.basePriceNgn : Number.NaN)
  if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1
    list.sort((a, b) => {
      const pa = price(a)
      const pb = price(b)
      if (Number.isNaN(pa) && Number.isNaN(pb)) return 0
      if (Number.isNaN(pa)) return 1
      if (Number.isNaN(pb)) return -1
      return (pa - pb) * dir
    })
  } else if (sort === 'capacity') {
    list.sort((a, b) => maxGuests(b) - maxGuests(a) || a.name.localeCompare(b.name))
  }
  return list
}

/** Weekend rate applies to Friday and Saturday nights. */
export function isWeekendNight(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 5 || day === 6
}

export function nightlyPrice(room: RoomType, iso: string): number {
  return isWeekendNight(iso) && room.weekendPriceNgn !== null ? room.weekendPriceNgn : room.basePriceNgn
}

const photos = (prefix: string, count: number, name: string): ImageAsset[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `/images/rooms/${prefix}-${i + 1}.webp`,
    alt: `${name}, photo ${i + 1} of ${count}`,
  }))

export const roomTypes: RoomType[] = [
  {
    id: 'rt-classic', slug: 'classic-room', name: 'Classic Room',
    description: 'A quiet, well-lit room with a queen bed and a work corner. Good for a short business stay.',
    bedConfig: '1 queen bed', bedType: 'queen', sizeSqm: 22, maxAdults: 2, maxChildren: 1,
    extraBed: { available: true, feeNgn: 10000 }, basePriceNgn: 45000, weekendPriceNgn: 50000,
    showPrice: true, breakfastIncluded: false, taxesIncluded: true, minStayNights: 1, popular: false,
    amenities: ['ac', 'wifi', 'tv', 'workdesk', 'power', 'security'], images: photos('classic', 3, 'Classic Room'),
  },
  {
    id: 'rt-deluxe', slug: 'deluxe-room', name: 'Deluxe Room',
    description: 'More space, a king bed and a private balcony. Breakfast is included in the rate.',
    bedConfig: '1 king bed', bedType: 'king', sizeSqm: 28, maxAdults: 2, maxChildren: 1,
    extraBed: { available: true, feeNgn: 10000 }, basePriceNgn: 65000, weekendPriceNgn: 72000,
    showPrice: true, breakfastIncluded: true, taxesIncluded: true, minStayNights: 1, popular: true,
    amenities: ['ac', 'wifi', 'workdesk', 'tv', 'balcony', 'power'], images: photos('deluxe', 4, 'Deluxe Room'),
  },
  {
    id: 'rt-executive', slug: 'executive-suite', name: 'Executive Suite',
    description: 'A king bedroom with a separate lounge and kitchenette. Suits longer work trips and small meetings.',
    bedConfig: '1 king bed and lounge', bedType: 'king', sizeSqm: 40, maxAdults: 2, maxChildren: 2,
    extraBed: { available: true, feeNgn: 0 }, basePriceNgn: 110000, weekendPriceNgn: 120000,
    showPrice: true, breakfastIncluded: true, taxesIncluded: false, minStayNights: 1, popular: false,
    amenities: ['ac', 'wifi', 'workdesk', 'kitchenette', 'balcony', 'tv', 'power'], images: photos('executive', 5, 'Executive Suite'),
  },
  {
    id: 'rt-one-bed', slug: 'one-bedroom-apartment', name: 'One-Bedroom Apartment',
    description: 'A full apartment with a bedroom, living area and kitchenette. Best for stays of two nights or more.',
    bedConfig: '1 king bed and sofa bed', bedType: 'king', sizeSqm: 55, maxAdults: 3, maxChildren: 1,
    extraBed: { available: false, feeNgn: null }, basePriceNgn: 95000, weekendPriceNgn: 105000,
    showPrice: true, breakfastIncluded: false, taxesIncluded: true, minStayNights: 2, popular: false,
    amenities: ['kitchenette', 'ac', 'wifi', 'tv', 'power', 'security'], images: photos('one-bed', 3, 'One-Bedroom Apartment'),
  },
  {
    id: 'rt-twin', slug: 'twin-room', name: 'Twin Room',
    description: 'Two single beds in a calm room, ideal for colleagues or friends travelling together.',
    bedConfig: '2 single beds', bedType: 'twin', sizeSqm: 24, maxAdults: 2, maxChildren: 1,
    extraBed: { available: false, feeNgn: null }, basePriceNgn: 52000, weekendPriceNgn: 58000,
    showPrice: true, breakfastIncluded: false, taxesIncluded: true, minStayNights: 1, popular: false,
    amenities: ['ac', 'wifi', 'tv'], images: photos('twin', 2, 'Twin Room'),
  },
  {
    id: 'rt-family', slug: 'family-apartment', name: 'Family Apartment',
    description: 'Two bedrooms worth of space with a kitchenette and balcony. Rates depend on the dates and group size.',
    bedConfig: '2 double beds', bedType: 'double', sizeSqm: 70, maxAdults: 4, maxChildren: 2,
    extraBed: { available: true, feeNgn: 15000 }, basePriceNgn: 0, weekendPriceNgn: null,
    showPrice: false, breakfastIncluded: false, taxesIncluded: true, minStayNights: 1, popular: false,
    amenities: ['kitchenette', 'ac', 'tv', 'wifi', 'balcony', 'parking'], images: photos('family', 3, 'Family Apartment'),
  },
  {
    id: 'rt-studio', slug: 'studio-apartment', name: 'Studio Apartment',
    description: 'An open-plan studio with a queen bed, kitchenette and desk. Self-contained and easy to settle into.',
    bedConfig: '1 queen bed', bedType: 'queen', sizeSqm: 35, maxAdults: 2, maxChildren: 1,
    extraBed: { available: true, feeNgn: 10000 }, basePriceNgn: 78000, weekendPriceNgn: 85000,
    showPrice: true, breakfastIncluded: false, taxesIncluded: true, minStayNights: 1, popular: false,
    amenities: ['kitchenette', 'ac', 'wifi', 'workdesk'], images: photos('studio', 1, 'Studio Apartment'),
  },
  {
    id: 'rt-two-bed', slug: 'two-bedroom-apartment', name: 'Two-Bedroom Apartment with Dining Area',
    description: 'Two bedrooms, a dining area and a full kitchenette. Room for a family or a small team.',
    bedConfig: '1 king bed and 2 single beds', bedType: 'king', sizeSqm: 85, maxAdults: 4, maxChildren: 2,
    extraBed: { available: true, feeNgn: 0 }, basePriceNgn: 150000, weekendPriceNgn: 165000,
    showPrice: true, breakfastIncluded: true, taxesIncluded: false, minStayNights: 1, popular: false,
    amenities: ['kitchenette', 'ac', 'wifi', 'tv', 'balcony', 'parking', 'power', 'security'], images: photos('two-bed', 8, 'Two-Bedroom Apartment'),
  },
]

export const policyHighlights = {
  checkIn: '[2:00 pm]',
  checkOut: '[12:00 noon]',
  cancellation: '[Add a one-line cancellation summary, for example free cancellation until 48 hours before arrival.]',
  fullPoliciesHref: '/cancellation',
}

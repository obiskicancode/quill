import type {
  AdminAmenityInput as AdminAmenityInputSchema,
  AdminExtraInput as AdminExtraInputSchema,
  AdminImageUpdate as AdminImageUpdateSchema,
  AdminRateRuleInput as AdminRateRuleInputSchema,
  AdminRoomTypeInput as AdminRoomTypeInputSchema,
  AdminRoomUnitInput as AdminRoomUnitInputSchema,
  ExtraPricingUnit as ExtraPricingUnitSchema,
  RateAdjustmentType as RateAdjustmentTypeSchema,
  ReorderItemsInput as ReorderItemsInputSchema,
  RoomStatus as RoomStatusSchema,
  UpdateRoomTypeAmenities as UpdateRoomTypeAmenitiesSchema,
} from '@/schemas/inventory.schema';

export type RoomStatus = RoomStatusSchema;
export type RateAdjustmentType = RateAdjustmentTypeSchema;
export type ExtraPricingUnit = ExtraPricingUnitSchema;
export type AdminRoomTypeInput = AdminRoomTypeInputSchema;
export type AdminRoomUnitInput = AdminRoomUnitInputSchema;
export type AdminImageUpdate = AdminImageUpdateSchema;
export type AdminRateRuleInput = AdminRateRuleInputSchema;
export type AdminExtraInput = AdminExtraInputSchema;
export type AdminAmenityInput = AdminAmenityInputSchema;
export type ReorderItemsInput = ReorderItemsInputSchema;
export type UpdateRoomTypeAmenities = UpdateRoomTypeAmenitiesSchema;

// TypeScript Interfaces for entities and API responses
export interface RateRuleInput {
  id: string;
  roomTypeId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  minNights: number | null;
  maxNights: number | null;
  daysOfWeek: number[] | null;
  adjustmentType: 'fixed_price' | 'percent_markup' | 'amount_markup';
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
  createdAt?: string | Date;
}

export interface NightRateResolution {
  date: string;
  resolvedRateMinor: number;
  baseRateMinor: number;
  isWeekend: boolean;
  winningRule: {
    id: string;
    name: string;
    adjustmentType: 'fixed_price' | 'percent_markup' | 'amount_markup';
    adjustmentValue: number;
    priority: number;
  } | null;
}

export interface AdminRoomTypeListItem {
  id: string;
  name: string;
  slug: string;
  basePriceMinor: number;
  weekendPriceMinor: number | null;
  showPrice: boolean;
  isActive: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  totalRooms: number;
  activeRooms: number;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoomUnit {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  nextReservation?: {
    id: string;
    reference: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  nextBlock?: {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
  } | null;
}

export interface AdminRoomImage {
  id: string;
  roomTypeId: string | null;
  category: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  blurDataUrl: string | null;
  altText: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isActive: boolean;
  isCover?: boolean;
}

export interface AdminAmenity {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  usageCount?: number;
  assignedRoomTypeIds?: string[];
}

export interface AdminRoomTypeDetail {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  bedConfig: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  minStayNights: number;
  basePriceMinor: number;
  weekendPriceMinor: number | null;
  extraAdultPriceMinor: number | null;
  extraChildPriceMinor: number | null;
  extraBedAvailable: boolean;
  extraBedPriceMinor?: number | null;
  showPrice: boolean;
  breakfastIncluded: boolean;
  taxesIncluded: boolean;
  viewNotes: string | null;
  sizeSqm: number | null;
  floorInfo: string | null;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: AdminRoomImage[];
  amenityIds: string[];
  rooms: AdminRoomUnit[];
  hasBookingHistory?: boolean;
}

export interface AdminRateRule {
  id: string;
  roomTypeId: string | null;
  roomTypeName?: string | null;
  name: string;
  startDate: string;
  endDate: string;
  minNights: number | null;
  maxNights: number | null;
  daysOfWeek: number[] | null;
  adjustmentType: RateAdjustmentType;
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasReservations?: boolean;
}

export interface AdminExtra {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMinor: number;
  maxQuantity: number;
  pricingUnit: ExtraPricingUnit;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  hasReservations?: boolean;
}

export interface RoomImpactCheckResponse {
  hasImpact: boolean;
  canChangeStatus: boolean;
  reservations: Array<{
    id: string;
    reference: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    status: string;
  }>;
  blocks: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes: string | null;
  }>;
}

export interface RateRuleConflict {
  id: string;
  name: string;
  priority: number;
  startDate: string;
  endDate: string;
  equalPriority: boolean;
}

export interface RateRuleOverlapResponse {
  hasOverlap: boolean;
  conflicts: RateRuleConflict[];
}

export interface PriceCalendarDay {
  date: string;
  baseRateMinor: number;
  resolvedRateMinor: number;
  isWeekend: boolean;
  winningRule: {
    id: string;
    name: string;
    adjustmentType: RateAdjustmentType;
    adjustmentValue: number;
    priority: number;
  } | null;
}

export interface PriceQuotePreviewResult {
  lines: Array<{
    date: string;
    rateMinor: number;
    note: string | null;
  }>;
  subtotalMinor: number;
  serviceChargeMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface AdminRoomTypeOption {
  id: string;
  name: string;
  slug: string;
  maxAdults: number;
  maxChildren: number;
  extraBedAvailable: boolean;
  basePriceMinor: number;
}

export interface ExtraCatalogItem {
  id: string;
  name: string;
  priceMinor: number;
  unit: string;
  maxQuantity: number;
}

import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';

export const RoomStatusSchema = z.enum(['active', 'maintenance', 'inactive']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const RateAdjustmentTypeSchema = z.enum([
  'fixed_price',
  'percent_markup',
  'amount_markup',
]);
export type RateAdjustmentType = z.infer<typeof RateAdjustmentTypeSchema>;

export const ExtraPricingUnitSchema = z.enum([
  'per_stay',
  'per_night',
  'per_guest',
  'per_guest_per_night',
]);
export type ExtraPricingUnit = z.infer<typeof ExtraPricingUnitSchema>;

// Room Type Schema
export const RoomTypeInputSchema = z.object({
  name: z.string().trim().min(2, ERROR_MESSAGES.NAME_MIN_TWO).max(150),
  slug: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.SLUG_MIN_TWO)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ERROR_MESSAGES.SLUG_PATTERN_INVALID),
  description: z.string().trim().nullable().optional(),
  shortDescription: z.string().trim().max(255).nullable().optional(),
  bedConfig: z.string().trim().max(100).nullable().optional(),
  sizeSqm: z.coerce.number().min(0).max(1000).nullable().optional(),
  maxAdults: z.coerce
    .number()
    .int()
    .min(1, ERROR_MESSAGES.AT_LEAST_ONE_ADULT_REQUIRED_SHORT)
    .default(2),
  maxChildren: z.coerce.number().int().min(0).default(0),
  extraBedAvailable: z.boolean().default(false),
  extraBedPriceMinor: z.coerce.number().int().min(0).nullable().optional(),
  basePriceMinor: z.coerce
    .number()
    .int()
    .min(0, ERROR_MESSAGES.BASE_PRICE_NEGATIVE),
  weekendPriceMinor: z.coerce.number().int().min(0).nullable().optional(),
  showPrice: z.boolean().default(true),
  breakfastIncluded: z.boolean().default(false),
  viewNotes: z.string().trim().nullable().optional(),
  metaTitle: z
    .string()
    .trim()
    .max(160, ERROR_MESSAGES.META_TITLE_TOO_LONG)
    .nullable()
    .optional(),
  metaDescription: z
    .string()
    .trim()
    .max(320, ERROR_MESSAGES.META_DESCRIPTION_TOO_LONG)
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  unlockSlugConfirmed: z.boolean().optional(),
});
export type RoomTypeInput = z.infer<typeof RoomTypeInputSchema>;

// Room Unit Schema
export const RoomUnitInputSchema = z.object({
  roomNumber: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.ROOM_NUMBER_REQUIRED)
    .max(20),
  floor: z.string().trim().max(20).nullable().optional(),
  status: RoomStatusSchema.default('active'),
  notes: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type RoomUnitInput = z.infer<typeof RoomUnitInputSchema>;

// Image Update Schema
export const ImageUpdateSchema = z.object({
  altText: z.string().trim().min(1, ERROR_MESSAGES.ALT_TEXT_REQUIRED).max(255),
  caption: z.string().trim().max(500).nullable().optional(),
  isCover: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
export type ImageUpdate = z.infer<typeof ImageUpdateSchema>;

// Rate Rule Schema
export const RateRuleFieldsSchema = z.object({
  name: z.string().trim().min(2, ERROR_MESSAGES.NAME_MIN_TWO).max(150),
  roomTypeId: z.string().uuid().nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.DATE_FORMAT_REQUIRED),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.DATE_FORMAT_REQUIRED),
  daysOfWeek: z
    .array(z.coerce.number().int().min(0).max(6))
    .nullable()
    .optional(),
  adjustmentType: RateAdjustmentTypeSchema,
  adjustmentValue: z.coerce.number().int(),
  minNights: z.coerce.number().int().min(1).nullable().optional(),
  maxNights: z.coerce.number().int().min(1).nullable().optional(),
  priority: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const RateRuleInputSchema = RateRuleFieldsSchema.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: ERROR_MESSAGES.END_DATE_ON_OR_AFTER_START,
    path: ['endDate'],
  },
);
export type RateRuleInput = z.infer<typeof RateRuleInputSchema>;

// Extra Schema
export const ExtraInputSchema = z.object({
  name: z.string().trim().min(2, ERROR_MESSAGES.NAME_MIN_TWO).max(150),
  slug: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.SLUG_MIN_TWO)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ERROR_MESSAGES.SLUG_PATTERN_INVALID),
  description: z.string().trim().nullable().optional(),
  priceMinor: z.coerce.number().int().min(0, ERROR_MESSAGES.PRICE_NEGATIVE),
  maxQuantity: z.coerce
    .number()
    .int()
    .min(1, ERROR_MESSAGES.MAX_QUANTITY_MIN_ONE)
    .default(10),
  pricingUnit: ExtraPricingUnitSchema.default('per_stay'),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type ExtraInput = z.infer<typeof ExtraInputSchema>;

// Amenity Schema
export const AmenityInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.KEY_MIN_TWO)
    .max(50)
    .regex(/^[a-z0-9_]+$/, ERROR_MESSAGES.KEY_PATTERN_INVALID),
  label: z.string().trim().min(2, ERROR_MESSAGES.LABEL_MIN_TWO).max(100),
  icon: z.string().trim().max(50).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type AmenityInput = z.infer<typeof AmenityInputSchema>;

// Reorder Schema
export const ReorderItemsInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.coerce.number().int(),
    }),
  ),
});
export type ReorderItemsInput = z.infer<typeof ReorderItemsInputSchema>;

// Room Type Amenities Update Schema
export const UpdateRoomTypeAmenitiesSchema = z.object({
  amenityIds: z.array(z.string().uuid()),
});
export type UpdateRoomTypeAmenities = z.infer<
  typeof UpdateRoomTypeAmenitiesSchema
>;

export const createRoomPayloadSchema = RoomUnitInputSchema.extend({
  roomTypeId: z.string().uuid(),
});

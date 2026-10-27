import { z } from 'zod';

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
export const AdminRoomTypeInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens',
    ),
  description: z.string().trim().nullable().optional(),
  shortDescription: z.string().trim().max(255).nullable().optional(),
  bedConfig: z.string().trim().max(100).nullable().optional(),
  sizeSqm: z.coerce.number().min(0).max(1000).nullable().optional(),
  maxAdults: z.coerce
    .number()
    .int()
    .min(1, 'At least 1 adult required')
    .default(2),
  maxChildren: z.coerce.number().int().min(0).default(0),
  extraBedAvailable: z.boolean().default(false),
  extraBedPriceMinor: z.coerce.number().int().min(0).nullable().optional(),
  basePriceMinor: z.coerce
    .number()
    .int()
    .min(0, 'Base price cannot be negative'),
  weekendPriceMinor: z.coerce.number().int().min(0).nullable().optional(),
  showPrice: z.boolean().default(true),
  breakfastIncluded: z.boolean().default(false),
  viewNotes: z.string().trim().nullable().optional(),
  metaTitle: z
    .string()
    .trim()
    .max(160, 'Meta title max 160 characters')
    .nullable()
    .optional(),
  metaDescription: z
    .string()
    .trim()
    .max(320, 'Meta description max 320 characters')
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  unlockSlugConfirmed: z.boolean().optional(),
});
export type AdminRoomTypeInput = z.infer<typeof AdminRoomTypeInputSchema>;

// Room Unit Schema
export const AdminRoomUnitInputSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
  floor: z.string().trim().max(20).nullable().optional(),
  status: RoomStatusSchema.default('active'),
  notes: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type AdminRoomUnitInput = z.infer<typeof AdminRoomUnitInputSchema>;

// Image Update Schema
export const AdminImageUpdateSchema = z.object({
  altText: z.string().trim().min(1, 'Alt text is required').max(255),
  caption: z.string().trim().max(500).nullable().optional(),
  isCover: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
export type AdminImageUpdate = z.infer<typeof AdminImageUpdateSchema>;

// Rate Rule Schema
export const AdminRateRuleInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(150),
    roomTypeId: z.string().uuid().nullable().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
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
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });
export type AdminRateRuleInput = z.infer<typeof AdminRateRuleInputSchema>;

// Extra Schema
export const AdminExtraInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(150)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens',
    ),
  description: z.string().trim().nullable().optional(),
  priceMinor: z.coerce.number().int().min(0, 'Price cannot be negative'),
  maxQuantity: z.coerce
    .number()
    .int()
    .min(1, 'Maximum quantity must be at least 1')
    .default(10),
  pricingUnit: ExtraPricingUnitSchema.default('per_stay'),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type AdminExtraInput = z.infer<typeof AdminExtraInputSchema>;

// Amenity Schema
export const AdminAmenityInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key must be at least 2 characters')
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      'Key must be lowercase letters, numbers, and underscores',
    ),
  label: z
    .string()
    .trim()
    .min(2, 'Label must be at least 2 characters')
    .max(100),
  icon: z.string().trim().max(50).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type AdminAmenityInput = z.infer<typeof AdminAmenityInputSchema>;

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

export const adminCreateRoomPayloadSchema = AdminRoomUnitInputSchema.extend({
  roomTypeId: z.string().uuid(),
});

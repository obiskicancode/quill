import { z } from 'zod';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { nairaToMinor, percentageToBps } from '@/lib/rate-resolution';
import {
  AdminAmenityInputSchema,
  AdminExtraInputSchema,
  AdminImageUpdateSchema,
  AdminRateRuleFieldsSchema,
  AdminRoomTypeInputSchema,
  AdminRoomUnitInputSchema,
  RateAdjustmentTypeSchema,
  RoomStatusSchema,
} from '@/schemas/inventory.schema';
import { adminPricingQuoteSchema } from '@/schemas/quote.schema';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function keyify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const amenityFormSchema = AdminAmenityInputSchema.omit({
  sortOrder: true,
})
  .extend({
    label: z
      .string()
      .trim()
      .min(1, ERROR_MESSAGES.AMENITY_LABEL_REQUIRED)
      .max(100),
    key: z.string().trim().max(50).default(''),
    description: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    const cleaned = data.key || keyify(data.label);
    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      ctx.addIssue({
        code: 'custom',
        path: ['key'],
        message: ERROR_MESSAGES.KEY_PATTERN_INVALID_DESCRIPTION,
      });
    }
  })
  .transform((data) => ({
    ...data,
    key: data.key || keyify(data.label),
    description: data.description.trim() || null,
  }));

export const extraFormSchema = AdminExtraInputSchema.omit({
  sortOrder: true,
  priceMinor: true,
})
  .extend({
    name: z.string().trim().min(1, ERROR_MESSAGES.EXTRA_NAME_REQUIRED).max(150),
    slug: z.string().trim().max(150).default(''),
    description: z.string().default(''),
    priceNaira: z.string().default(''),
    maxQuantity: z
      .number()
      .int()
      .min(1, ERROR_MESSAGES.MAX_QUANTITY_MIN_ONE)
      .default(10),
  })
  .superRefine((data, ctx) => {
    const slug = data.slug || slugify(data.name);
    if (!slugRegex.test(slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: ERROR_MESSAGES.SLUG_PATTERN_INVALID,
      });
    }
  })
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.name),
    description: data.description.trim() || null,
  }));

export const rateRuleFormSchema = AdminRateRuleFieldsSchema.omit({
  adjustmentValue: true,
  minNights: true,
  maxNights: true,
})
  .extend({
    name: z.string().trim().min(1, ERROR_MESSAGES.RULE_NAME_REQUIRED).max(150),
    startDate: z
      .string()
      .min(1, ERROR_MESSAGES.START_END_DATES_REQUIRED)
      .regex(dateRegex, ERROR_MESSAGES.DATE_FORMAT_REQUIRED),
    endDate: z
      .string()
      .min(1, ERROR_MESSAGES.START_END_DATES_REQUIRED)
      .regex(dateRegex, ERROR_MESSAGES.DATE_FORMAT_REQUIRED),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    adjustmentType: RateAdjustmentTypeSchema,
    adjustmentInput: z.string().default('20'),
    minNights: z.string().default(''),
    maxNights: z.string().default(''),
    priority: z.number().int().default(0),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: ERROR_MESSAGES.END_DATE_ON_OR_AFTER_START,
    path: ['endDate'],
  })
  .superRefine((data, ctx) => {
    if (
      data.adjustmentType === 'percent_markup' &&
      Number.isNaN(parseFloat(data.adjustmentInput))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['adjustmentInput'],
        message: ERROR_MESSAGES.INVALID_PERCENTAGE,
      });
    }
  })
  .transform((data) => {
    const adjustmentValue =
      data.adjustmentType === 'percent_markup'
        ? percentageToBps(parseFloat(data.adjustmentInput))
        : nairaToMinor(data.adjustmentInput);
    const { adjustmentInput, ...rest } = data;
    void adjustmentInput;
    return {
      ...rest,
      roomTypeId: data.roomTypeId?.trim() ? data.roomTypeId : null,
      daysOfWeek:
        data.daysOfWeek && data.daysOfWeek.length > 0 ? data.daysOfWeek : null,
      adjustmentValue,
      minNights: data.minNights ? parseInt(data.minNights, 10) : null,
      maxNights: data.maxNights ? parseInt(data.maxNights, 10) : null,
    };
  });

export const roomTypeDetailsFormSchema = AdminRoomTypeInputSchema.omit({
  sizeSqm: true,
  extraBedPriceMinor: true,
  basePriceMinor: true,
  weekendPriceMinor: true,
  unlockSlugConfirmed: true,
})
  .extend({
    sizeSqm: z.string().default(''),
    extraBedPriceNaira: z.string().default('0'),
    basePriceNaira: z.string().default(''),
    weekendPriceNaira: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    if (nairaToMinor(data.basePriceNaira) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['basePriceNaira'],
        message: ERROR_MESSAGES.BASE_PRICE_MUST_BE_POSITIVE,
      });
    }
  })
  .transform((data) => {
    const { basePriceNaira, weekendPriceNaira, extraBedPriceNaira, ...rest } =
      data;
    return {
      ...rest,
      description: data.description?.trim() || null,
      shortDescription: data.shortDescription?.trim() || null,
      bedConfig: data.bedConfig?.trim() || null,
      sizeSqm: data.sizeSqm ? parseFloat(data.sizeSqm) : null,
      extraBedPriceMinor: data.extraBedAvailable
        ? nairaToMinor(extraBedPriceNaira)
        : null,
      basePriceMinor: nairaToMinor(basePriceNaira),
      weekendPriceMinor: weekendPriceNaira.trim()
        ? nairaToMinor(weekendPriceNaira)
        : null,
      viewNotes: data.viewNotes?.trim() || null,
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
    };
  });

export const roomUnitFormSchema = AdminRoomUnitInputSchema.omit({
  isActive: true,
})
  .extend({
    roomNumber: z
      .string()
      .trim()
      .min(1, ERROR_MESSAGES.ROOM_NUMBER_REQUIRED)
      .max(20),
    floor: z.string().default(''),
    status: RoomStatusSchema,
    notes: z.string().default(''),
  })
  .transform((data) => ({
    ...data,
    floor: data.floor.trim() || null,
    notes: data.notes.trim() || null,
    isActive: data.status === 'active',
  }));

export const photoUploadFormSchema = z.object({
  file: z.custom<File | null>(
    (value) => value === null || value instanceof File,
  ),
  altText: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.ALT_TEXT_REQUIRED_PUBLISHING)
    .max(255),
  caption: z.string().default(''),
});

export const photoEditFormSchema = AdminImageUpdateSchema.omit({
  isCover: true,
  sortOrder: true,
})
  .extend({
    altText: z
      .string()
      .trim()
      .min(1, ERROR_MESSAGES.ALT_TEXT_CANNOT_BE_EMPTY)
      .max(255),
    caption: z.string().default(''),
  })
  .transform((data) => ({
    ...data,
    caption: data.caption.trim() || null,
  }));

export const priceQuoteFormSchema = adminPricingQuoteSchema
  .omit({ roomTypeId: true })
  .extend({
    adults: z.number().int().min(1).default(2),
    children: z.number().int().min(0).default(0),
    extraBed: z.boolean().default(false),
  });

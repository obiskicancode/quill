import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  blockReasonEnum,
  extraPricingUnitEnum,
  rateAdjustmentTypeEnum,
  roomStatusEnum,
} from './enums';

export const roomTypes = pgTable(
  'room_types',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 150 }).notNull().unique(),
    shortDescription: text('short_description'),
    description: text('description'),
    bedConfig: varchar('bed_config', { length: 100 }),
    maxAdults: smallint('max_adults').notNull().default(2),
    maxChildren: smallint('max_children').notNull().default(0),
    maxOccupancy: smallint('max_occupancy').notNull().default(2),
    minStayNights: smallint('min_stay_nights').notNull().default(1),
    basePriceMinor: integer('base_price_minor').notNull().default(0),
    weekendPriceMinor: integer('weekend_price_minor'),
    extraAdultPriceMinor: integer('extra_adult_price_minor').default(0),
    extraChildPriceMinor: integer('extra_child_price_minor').default(0),
    extraBedAvailable: boolean('extra_bed_available').notNull().default(false),
    showPrice: boolean('show_price').notNull().default(true),
    breakfastIncluded: boolean('breakfast_included').notNull().default(false),
    taxesIncluded: boolean('taxes_included').notNull().default(false),
    viewNotes: text('view_notes'),
    sizeSqm: numeric('size_sqm', { precision: 6, scale: 2 }),
    floorInfo: varchar('floor_info', { length: 50 }),
    smokingAllowed: boolean('smoking_allowed').notNull().default(false),
    petsAllowed: boolean('pets_allowed').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    metaTitle: varchar('meta_title', { length: 160 }),
    metaDescription: varchar('meta_description', { length: 320 }),
    coverImageUrl: text('cover_image_url'),
    coverImageAlt: varchar('cover_image_alt', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rt_slug').on(table.slug),
    index('idx_rt_active').on(table.isActive),
    check(
      'chk_rt_price',
      sql`${table.basePriceMinor} >= 0 AND ${table.maxAdults} >= 1`,
    ),
  ],
);

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomTypeId: uuid('room_type_id')
      .notNull()
      .references(() => roomTypes.id, { onDelete: 'restrict' }),
    roomNumber: varchar('room_number', { length: 20 }).notNull(),
    floor: varchar('floor', { length: 20 }),
    status: roomStatusEnum('status').notNull().default('active'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rooms_type').on(table.roomTypeId),
    index('idx_rooms_status').on(table.status),
  ],
);

export const amenities = pgTable('amenities', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roomTypeAmenities = pgTable(
  'room_type_amenities',
  {
    roomTypeId: uuid('room_type_id')
      .notNull()
      .references(() => roomTypes.id, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_rta_room_type').on(table.roomTypeId)],
);

export const roomBlocks = pgTable(
  'room_blocks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    reason: blockReasonEnum('reason').notNull().default('maintenance'),
    notes: text('notes'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rb_room').on(table.roomId),
    index('idx_rb_dates').on(table.startDate, table.endDate),
    check('chk_block_dates', sql`${table.endDate} > ${table.startDate}`),
  ],
);

export const rateRules = pgTable(
  'rate_rules',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomTypeId: uuid('room_type_id').references(() => roomTypes.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 150 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    minNights: smallint('min_nights').default(1),
    maxNights: smallint('max_nights'),
    daysOfWeek: smallint('days_of_week').array(),
    adjustmentType: rateAdjustmentTypeEnum('adjustment_type').notNull(),
    adjustmentValue: integer('adjustment_value').notNull(),
    priority: integer('priority').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_rr_room_type').on(table.roomTypeId),
    index('idx_rr_dates').on(table.startDate, table.endDate),
    index('idx_rr_active').on(table.isActive),
    check('chk_rule_dates', sql`${table.endDate} >= ${table.startDate}`),
  ],
);

export const extras = pgTable('extras', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  description: text('description'),
  priceMinor: integer('price_minor').notNull().default(0),
  maxQuantity: integer('max_quantity').notNull().default(10),
  pricingUnit: extraPricingUnitEnum('pricing_unit')
    .notNull()
    .default('per_stay'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

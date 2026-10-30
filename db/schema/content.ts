import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { reservations } from './bookings';
import {
  enquiryStatusEnum,
  enquiryTypeEnum,
  galleryCategoryEnum,
} from './enums';
import { roomTypes } from './rooms';
import { staffUsers } from './staff';

export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: enquiryTypeEnum('type').notNull().default('general'),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    subject: varchar('subject', { length: 200 }),
    message: text('message').notNull(),
    checkIn: date('check_in'),
    checkOut: date('check_out'),
    guests: integer('guests'),
    roomTypeInterest: varchar('room_type_interest', { length: 150 }),
    status: enquiryStatusEnum('status').notNull().default('new'),
    source: varchar('source', { length: 50 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    isSpam: boolean('is_spam').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    anonymisedAt: timestamp('anonymised_at', { withTimezone: true }),
    assignedTo: uuid('assigned_to').references(() => staffUsers.id, {
      onDelete: 'set null',
    }),
    reservationId: uuid('reservation_id').references(() => reservations.id, {
      onDelete: 'set null',
    }),
    convertedReservationId: uuid('converted_reservation_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_enq_status').on(table.status),
    index('idx_enq_type').on(table.type),
    index('idx_enq_email').on(table.email),
    index('idx_enq_phone').on(table.phone),
    index('idx_enq_created').on(table.createdAt),
    index('idx_enq_spam').on(table.isSpam),
    index('idx_enq_assigned_to').on(table.assignedTo),
    index('idx_enq_status_spam_created').on(
      table.status,
      table.isSpam,
      table.createdAt,
    ),
  ],
);

export const enquiryReplies = pgTable('enquiry_replies', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  enquiryId: uuid('enquiry_id')
    .notNull()
    .references(() => enquiries.id, { onDelete: 'cascade' }),
  staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
  sentBy: uuid('sent_by').references(() => staffUsers.id),
  channel: varchar('channel', { length: 20 }).default('email'),
  message: text('message').notNull(),
  sentVia: varchar('sent_via', { length: 20 }).default('email'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enquiryNotes = pgTable('enquiry_notes', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  enquiryId: uuid('enquiry_id')
    .notNull()
    .references(() => enquiries.id, { onDelete: 'cascade' }),
  staffUserId: uuid('staff_user_id').references(() => staffUsers.id),
  createdBy: uuid('created_by').references(() => staffUsers.id, {
    onDelete: 'cascade',
  }),
  note: text('note').notNull().default(''),
  body: text('body'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sitePages = pgTable('site_pages', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  intro: text('intro'),
  template: varchar('template', { length: 50 }).default('default'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  heroImageUrl: text('hero_image_url'),
  heroImageAlt: varchar('hero_image_alt', { length: 255 }),
  content: jsonb('content'),
  metaTitle: varchar('meta_title', { length: 160 }),
  metaDescription: varchar('meta_description', { length: 320 }),
  ogImageUrl: text('og_image_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sitePageRevisions = pgTable(
  'site_page_revisions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pageId: uuid('page_id')
      .notNull()
      .references(() => sitePages.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    body: text('body'),
    content: jsonb('content').notNull(),
    editedBy: uuid('edited_by').references(() => staffUsers.id),
    note: varchar('note', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_site_page_revisions_page_created').on(
      table.pageId,
      table.createdAt.desc(),
    ),
  ],
);

export const facilities = pgTable('facilities', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  kind: varchar('kind', { length: 30 }).notNull().default('other'),
  openingHours: varchar('opening_hours', { length: 255 }),
  pricing: varchar('pricing', { length: 20 }),
  priceNote: text('price_note'),
  capacity: varchar('capacity', { length: 100 }),
  layouts: text('layouts')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  ctaLabel: varchar('cta_label', { length: 100 }),
  ctaTopic: varchar('cta_topic', { length: 50 }),
  imageUrl: text('image_url'),
  imageAlt: varchar('image_alt', { length: 255 }),
  storageKey: varchar('storage_key', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    category: galleryCategoryEnum('category').notNull().default('other'),
    title: varchar('title', { length: 150 }),
    altText: varchar('alt_text', { length: 255 }).notNull(),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    storageKey: varchar('storage_key', { length: 255 }),
    caption: text('caption'),
    roomTypeId: uuid('room_type_id').references(() => roomTypes.id, {
      onDelete: 'set null',
    }),
    facilityId: uuid('facility_id'),
    width: integer('width'),
    height: integer('height'),
    color: varchar('color', { length: 9 }),
    blurDataUrl: text('blur_data_url'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_gi_category').on(table.category)],
);

export const testimonials = pgTable('testimonials', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  guestName: varchar('guest_name', { length: 150 }).notNull(),
  roomTypeId: uuid('room_type_id').references(() => roomTypes.id, {
    onDelete: 'set null',
  }),
  location: varchar('location', { length: 100 }),
  quote: text('quote').notNull(),
  rating: integer('rating'),
  stayType: varchar('stay_type', { length: 50 }),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  imageUrl: text('image_url'),
  imageAlt: varchar('image_alt', { length: 255 }),
  storageKey: varchar('storage_key', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const faqs = pgTable('faqs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  question: varchar('question', { length: 255 }).notNull(),
  answer: text('answer').notNull(),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 150 }).notNull(),
  role: varchar('role', { length: 100 }),
  bio: text('bio'),
  imageUrl: text('image_url'),
  imageAlt: varchar('image_alt', { length: 255 }),
  storageKey: varchar('storage_key', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const nearbyAttractions = pgTable('nearby_attractions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 150 }).notNull(),
  distance: varchar('distance', { length: 50 }),
  description: text('description'),
  imageUrl: text('image_url'),
  imageAlt: varchar('image_alt', { length: 255 }),
  storageKey: varchar('storage_key', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

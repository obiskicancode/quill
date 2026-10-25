import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { reservations } from './bookings';
import { notificationChannelEnum, notificationStatusEnum } from './enums';
import { staffUsers } from './staff';

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  variables: jsonb('variables'),
  isActive: boolean('is_active').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationRecipients = pgTable('notification_recipients', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateKey: varchar('template_key', { length: 100 }).notNull(),
  recipientType: varchar('recipient_type', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reservationId: uuid('reservation_id').references(() => reservations.id),
    templateKey: varchar('template_key', { length: 100 }),
    channel: notificationChannelEnum('channel').notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    body: text('body'),
    status: notificationStatusEnum('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    error: text('error'),
    providerResponse: jsonb('provider_response'),
    dedupeKey: varchar('dedupe_key', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_nl_res').on(table.reservationId),
    index('idx_nl_status').on(table.status),
    index('idx_nl_channel').on(table.channel),
    index('idx_nl_created').on(table.createdAt),
    index('idx_nl_dedupe').on(table.dedupeKey),
  ],
);

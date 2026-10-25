import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { staffRoleEnum, tokenPurposeEnum } from './enums';

export const staffUsers = pgTable(
  'staff_users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    role: staffRoleEnum('role').notNull().default('reception'),
    phone: varchar('phone', { length: 30 }),
    isActive: boolean('is_active').notNull().default(true),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    invitedBy: uuid('invited_by'),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: inet('last_login_ip'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecretEncrypted: text('mfa_secret_encrypted'),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivatedBy: uuid('deactivated_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_staff_email').on(table.email),
    index('idx_staff_role').on(table.role),
    index('idx_staff_active').on(table.isActive),
  ],
);

export const staffRecoveryCodes = pgTable('staff_recovery_codes', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  staffUserId: uuid('staff_user_id')
    .notNull()
    .references(() => staffUsers.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const staffSessions = pgTable(
  'staff_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'cascade' }),
    sessionTokenHash: varchar('session_token_hash', { length: 255 })
      .notNull()
      .unique(),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
    deviceInfo: jsonb('device_info'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    stepUpVerifiedAt: timestamp('step_up_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_staff_sessions_user').on(table.staffUserId),
    index('idx_staff_sessions_expires').on(table.expiresAt),
    index('idx_staff_sessions_token').on(table.sessionTokenHash),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    purpose: tokenPurposeEnum('purpose').notNull().default('reset'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    requestedIp: inet('requested_ip'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_prt_user').on(table.staffUserId),
    index('idx_prt_token').on(table.tokenHash),
    index('idx_prt_expires').on(table.expiresAt),
  ],
);

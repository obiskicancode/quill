import { sql } from 'drizzle-orm';
import {
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { staffRoleEnum } from './enums';
import { staffUsers } from './staff';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorId: uuid('actor_id').references(() => staffUsers.id),
    actorRole: staffRoleEnum('actor_role'),
    entity: varchar('entity', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }).notNull(),
    action: varchar('action', { length: 30 }).notNull(),
    reason: text('reason'),
    changes: jsonb('changes'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_entity').on(table.entity, table.entityId),
    index('idx_audit_actor').on(table.actorId),
    index('idx_audit_created').on(table.createdAt),
    index('idx_audit_action').on(table.action),
  ],
);

export const seedRecords = pgTable(
  'seed_records',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tableName: varchar('table_name', { length: 64 }).notNull(),
    rowId: varchar('row_id', { length: 64 }).notNull(),
    seedName: varchar('seed_name', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_sr_table_row').on(table.tableName, table.rowId)],
);

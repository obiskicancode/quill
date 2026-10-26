import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, reservations, staffUsers } from '@/db/schema';
import type { StaffUser } from '@/db/types';
import { generateAuditDiff } from '@/lib/audit/masking';
import type { AdminRole } from '@/lib/auth/permissions';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { generateCsvStream } from '@/lib/export/csv';
import type {
  AuditDetailResponse,
  AuditListItem,
  AuditQueryParams,
} from '@/types/audit-admin.types';

const SECURITY_ENTITIES = [
  'staff_user',
  'staff_session',
  'auth',
  'mfa',
  'password_reset',
];

export async function listAuditRepo(
  params: AuditQueryParams,
  role: AdminRole,
): Promise<{
  items: AuditListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const conditions = [];

    // Filter out security events on server for managers
    if (role !== 'owner') {
      conditions.push(notInArray(auditLogs.entity, SECURITY_ENTITIES));
    }

    // Apply Presets
    if (params.preset === 'rates') {
      conditions.push(inArray(auditLogs.entity, ['room_type', 'rate_rule']));
    } else if (params.preset === 'payments') {
      conditions.push(
        inArray(auditLogs.entity, [
          'payment',
          'refund',
          'payment_webhook_event',
        ]),
      );
    } else if (params.preset === 'bank_accounts') {
      conditions.push(inArray(auditLogs.entity, ['bank_account', 'settings']));
    } else if (params.preset === 'staff_security') {
      if (role === 'owner') {
        conditions.push(inArray(auditLogs.entity, SECURITY_ENTITIES));
      } else {
        // Manager cannot view staff_security preset
        return {
          items: [],
          total: 0,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: 0,
        };
      }
    } else if (params.preset === 'cancellations') {
      conditions.push(eq(auditLogs.action, 'cancel'));
    }

    if (params.entity) {
      conditions.push(eq(auditLogs.entity, params.entity));
    }
    if (params.action) {
      conditions.push(eq(auditLogs.action, params.action));
    }
    if (params.from) {
      conditions.push(
        sql`${auditLogs.createdAt} >= ${params.from}::timestamptz`,
      );
    }
    if (params.to) {
      conditions.push(sql`${auditLogs.createdAt} <= ${params.to}::timestamptz`);
    }

    if (params.q) {
      conditions.push(
        or(
          ilike(auditLogs.entityId, `%${params.q}%`),
          ilike(auditLogs.reason, `%${params.q}%`),
          role === 'owner'
            ? sql`${auditLogs.ipAddress}::text ILIKE ${'%' + params.q + '%'}`
            : sql`1=0`,
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countRes[0]?.count || 0);

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 0,
      };
    }

    const offset = (params.page - 1) * params.pageSize;
    const rows = await db
      .select({
        audit: auditLogs,
        actor: staffUsers,
      })
      .from(auditLogs)
      .leftJoin(staffUsers, eq(auditLogs.actorId, staffUsers.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    const items: AuditListItem[] = rows.map(({ audit: a, actor: u }) => {
      let actorName = 'System';
      let actorRole: AdminRole | 'guest' | 'system' = 'system';

      if (u) {
        actorName = `${u.firstName} ${u.lastName}`;
        actorRole = a.actorRole || u.role;
      } else if (a.actorId === null && a.action.startsWith('guest_')) {
        actorName = 'Guest';
        actorRole = 'guest';
      }

      let entityLink: string | null = null;
      if (a.entity === 'reservation') {
        entityLink = `/admin/reservations/${a.entityId}`;
      } else if (a.entity === 'room_type') {
        entityLink = `/admin/rooms/${a.entityId}`;
      } else if (a.entity === 'rate_rule') {
        entityLink = '/admin/rates';
      } else if (a.entity === 'staff_user' && role === 'owner') {
        entityLink = `/admin/staff?selected=${a.entityId}`;
      } else if (a.entity === 'payment') {
        entityLink = `/admin/payments?selected=${a.entityId}`;
      }

      return {
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        utcTime: a.createdAt.toUTCString(),
        actorId: a.actorId,
        actorName,
        actorRole,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        entityRef: a.entityId,
        entityLink,
        summary: a.reason || `${a.action} on ${a.entity}`,
        ipAddress: role === 'owner' ? a.ipAddress : null,
      };
    });

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    };
  } catch {
    return {
      items: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: 0,
    };
  }
}

export async function getAuditDetailRepo(
  id: string,
  role: AdminRole,
): Promise<AuditDetailResponse | null> {
  try {
    const [row] = await db
      .select({
        audit: auditLogs,
        actor: staffUsers,
      })
      .from(auditLogs)
      .leftJoin(staffUsers, eq(auditLogs.actorId, staffUsers.id))
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (!row) return null;
    const { audit: a, actor: u } = row;

    if (role !== 'owner' && SECURITY_ENTITIES.includes(a.entity)) {
      return null;
    }

    let actorName = 'System';
    let actorRole: AdminRole | 'guest' | 'system' = 'system';

    if (u) {
      actorName = `${u.firstName} ${u.lastName}`;
      actorRole = a.actorRole || u.role;
    } else if (a.actorId === null && a.action.startsWith('guest_')) {
      actorName = 'Guest';
      actorRole = 'guest';
    }

    let entityLink: string | null = null;
    let isEntityAvailable = true;

    if (a.entity === 'reservation') {
      const [res] = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(eq(reservations.id, a.entityId))
        .limit(1);
      if (res) {
        entityLink = `/admin/reservations/${a.entityId}`;
      } else {
        isEntityAvailable = false;
      }
    } else if (a.entity === 'payment') {
      entityLink = `/admin/payments?selected=${a.entityId}`;
    } else if (a.entity === 'room_type') {
      entityLink = `/admin/rooms/${a.entityId}`;
    }

    const changes = a.changes as {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    } | null;
    const diffs = generateAuditDiff(changes?.before, changes?.after);

    return {
      id: a.id,
      createdAt: a.createdAt.toISOString(),
      utcTime: a.createdAt.toUTCString(),
      actorId: a.actorId,
      actorName,
      actorRole,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      entityRef: a.entityId,
      entityLink,
      isEntityAvailable,
      reason: a.reason,
      diffs,
      ipAddress: role === 'owner' ? a.ipAddress : null,
      userAgent: role === 'owner' ? a.userAgent : null,
    };
  } catch {
    return null;
  }
}

export async function exportAuditCsvRepo(
  params: AuditQueryParams,
  actor: StaffUser,
  ipAddress?: string | null,
): Promise<{ csv: string; totalExported: number; capped: boolean }> {
  // Owner only CSV export
  const list = await listAuditRepo(
    { ...params, pageSize: 10_000, page: 1 },
    'owner',
  );

  const headers = [
    'Date / Time (Lagos)',
    'Date / Time (UTC)',
    'Actor',
    'Role',
    'Action',
    'Entity',
    'Entity ID',
    'Summary',
    'IP Address',
  ];

  const rows = list.items.map((item) => [
    item.createdAt,
    item.utcTime,
    item.actorName,
    item.actorRole,
    item.action,
    item.entity,
    item.entityId,
    item.summary,
    item.ipAddress || '',
  ]);

  const stream = generateCsvStream({
    headers,
    rows,
    maxRows: 10_000,
  });

  // Audited action
  await recordAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    entity: 'audit_logs',
    entityId: 'export',
    action: 'export',
    reason: `Exported ${stream.totalExported} audit log rows to CSV`,
    ipAddress,
  }).catch(() => {});

  return stream;
}

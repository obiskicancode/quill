import { NextResponse } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { exportAuditCsvRepo } from '@/lib/db/repositories/audit-admin.repo';
import { apiFail } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { AuditQuerySchema } from '@/schemas/audit.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'audit.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  // Owner only CSV export
  if (context.role !== 'owner') {
    return apiFail(403, ERROR_MESSAGES.OWNERS_ONLY_AUDIT_EXPORT, undefined, {
      noCache: true,
    });
  }

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = AuditQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(400, ERROR_MESSAGES.INVALID_PARAMETERS, undefined, {
      noCache: true,
    });
  }

  const stream = await exportAuditCsvRepo(
    parsed.data,
    context.user,
    clientIp(request),
  );

  return new NextResponse(stream.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Rows-Capped': stream.capped ? 'true' : 'false',
    },
  });
}

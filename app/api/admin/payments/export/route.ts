import { NextResponse } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import { listPaymentsRepo } from '@/lib/db/repositories/payments-admin.repo';
import { generateCsvStream } from '@/lib/export/csv';
import { apiFail } from '@/lib/http/envelope';
import { clientIp, userAgent } from '@/lib/http/request';
import { PaymentsQuerySchema } from '@/schemas/payments-admin.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;
  const context = guard.context;

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = PaymentsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(400, 'Invalid parameters', undefined, { noCache: true });
  }

  const result = await listPaymentsRepo({
    ...parsed.data,
    pageSize: 10_000,
    page: 1,
  });

  const headers = [
    'Date',
    'Payment Reference',
    'Booking Reference',
    'Guest Name',
    'Guest Email',
    'Type',
    'Provider',
    'Method',
    'Status',
    'Amount (₦)',
    'Provider Ref',
    'Reconciled',
    'Reconciled By',
    'Reconciled Date',
  ];

  const rows = result.items.map((p) => [
    p.createdAt,
    p.reference,
    p.reservationRef,
    p.guestName,
    p.guestEmail,
    p.type,
    p.provider,
    p.method,
    p.status,
    `₦${(p.amountMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
    p.providerRef || '',
    p.reconciled ? 'Yes' : 'No',
    p.reconciledByName || '',
    p.reconciledAt || '',
  ]);

  const stream = generateCsvStream({ headers, rows, maxRows: 10_000 });

  await recordAuditLog({
    actorId: context.user.id,
    actorRole: context.role,
    entity: 'payment',
    entityId: 'export',
    action: 'export',
    reason: `Exported ${stream.totalExported} payment rows to CSV`,
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  }).catch(() => {});

  return new NextResponse(stream.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Rows-Capped': stream.capped ? 'true' : 'false',
    },
  });
}

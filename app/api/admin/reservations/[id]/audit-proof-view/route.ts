import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { logProofViewAudit } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, 'Missing reservation ID.');

  try {
    const body = await request.json().catch(() => ({}));
    await logProofViewAudit(id, guard.context.user.id, body.paymentId);
    return apiOk({ logged: true });
  } catch (error) {
    console.error('Failed to log proof view audit:', error);
    return apiFail(500, 'Unable to log audit entry.');
  }
}

import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { logProofViewAudit } from '@/lib/db/repositories/reservations.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID_PERIOD);

  try {
    const body = await request.json().catch(() => ({}));
    await logProofViewAudit(id, guard.context.user.id, body.paymentId);
    return apiOk({ logged: true });
  } catch (error) {
    console.error('Failed to log proof view audit:', error);
    return apiFail(500, ERROR_MESSAGES.FAILED_TO_LOG_AUDIT);
  }
}

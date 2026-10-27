import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { verifyBankTransfer } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminVerifyTransferSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'payments.verify',
  });
  if (!guard.ok) return guard.response;

  const { id, paymentId } = await params;
  if (!id || !paymentId) {
    return apiFail(400, 'Missing reservation or payment identifier.');
  }

  const body = await request.json().catch(() => null);
  const parsed = adminVerifyTransferSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid verification payload', parsed.error.flatten());
  }

  const idKey = `admin:verify:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const updated = await verifyBankTransfer(
      id,
      paymentId,
      'verify',
      parsed.data.amountMinor,
      undefined,
      parsed.data.note,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, updated, 200, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/payments/${paymentId}/verify`,
    });

    return apiOk(updated, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to verify transfer.';
    return apiFail(400, message);
  }
}

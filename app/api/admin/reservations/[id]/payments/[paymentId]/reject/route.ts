import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { verifyBankTransfer } from '@/lib/db/repositories/reservations.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { verifyTransferSchema } from '@/schemas/reservation.schema';

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
    return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_PAYMENT_ID);
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyTransferSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_REJECTION_PAYLOAD,
      parsed.error.flatten(),
    );
  }

  const idKey = `admin:reject:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const updated = await verifyBankTransfer(
      id,
      paymentId,
      'reject',
      parsed.data.version,
      undefined,
      parsed.data.rejectionReason,
      parsed.data.note,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, updated, 200, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/payments/${paymentId}/reject`,
    });

    return apiOk(updated, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_REJECT_TRANSFER;
    return apiFail(400, message);
  }
}

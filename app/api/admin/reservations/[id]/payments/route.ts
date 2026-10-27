import { NextRequest } from 'next/server';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { recordAdminPayment } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminRecordPaymentSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'payments.record',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID);

  const body = await request.json().catch(() => null);
  const parsed = adminRecordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_PAYMENT_DATA,
      parsed.error.flatten(),
    );
  }

  const idKey = `admin:pay:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const updated = await recordAdminPayment(
      id,
      parsed.data.version,
      parsed.data,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, updated, 201, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/payments`,
    });

    return apiOk(updated, { status: 201, noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_RECORD_PAYMENT;
    const status = message.includes(ERROR_CODES.VERSION_CONFLICT) ? 409 : 400;
    return apiFail(status, message);
  }
}

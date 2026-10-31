import { NextRequest } from 'next/server';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { updateReservationDetails } from '@/lib/db/repositories/reservations.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { editDetailsSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.edit_details',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID);

  const body = await request.json().catch(() => null);
  const parsed = editDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, ERROR_MESSAGES.INVALID_DETAILS, parsed.error.flatten());
  }

  const idKey = `admin:det:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const updated = await updateReservationDetails(
      id,
      parsed.data.version,
      parsed.data,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, updated, 200, 60, {
      reservationId: id,
      method: 'PATCH',
      path: `/api/admin/reservations/${id}/details`,
    });

    return apiOk(updated, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_DETAILS;
    const status = message.includes(ERROR_CODES.VERSION_CONFLICT) ? 409 : 400;
    return apiFail(status, message);
  }
}

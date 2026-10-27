import { NextRequest } from 'next/server';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { markReservationNoShow } from '@/lib/db/repositories/reservations-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminNoShowSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.no_show',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID);

  const body = await request.json().catch(() => null);
  const parsed = adminNoShowSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_NO_SHOW_DATA,
      parsed.error.flatten(),
    );
  }

  const idKey = `admin:no-show:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  try {
    const updated = await markReservationNoShow(
      id,
      parsed.data.version,
      parsed.data,
      guard.context.user.id,
      guard.context.role,
      clock.today,
    );

    await setIdempotency(idKey, updated, 200, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/no-show`,
    });

    return apiOk(updated, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_MARK_NO_SHOW;
    const status = message.includes(ERROR_CODES.VERSION_CONFLICT) ? 409 : 400;
    return apiFail(status, message);
  }
}

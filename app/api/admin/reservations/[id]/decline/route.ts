import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { approveOrDeclineBooking } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminApproveDeclineSchema } from '@/types/reservation.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.approve',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, 'Missing reservation ID');

  const body = await request.json().catch(() => null);
  const parsed = adminApproveDeclineSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid decline data', parsed.error.flatten());
  }

  const idKey = `admin:decline:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const updated = await approveOrDeclineBooking(
      id,
      parsed.data.version,
      'decline',
      parsed.data.reason,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, updated, 200, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/decline`,
    });

    return apiOk(updated, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to decline booking.';
    const status = message.includes('VERSION_CONFLICT') ? 409 : 400;
    return apiFail(status, message);
  }
}

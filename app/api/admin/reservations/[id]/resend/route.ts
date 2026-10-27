import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { resendReservationConfirmation } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminResendConfirmationSchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.resend',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, 'Missing reservation ID');

  const body = await request.json().catch(() => null);
  const parsed = adminResendConfirmationSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid resend parameters', parsed.error.flatten());
  }

  const idKey = `admin:resend:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const result = await resendReservationConfirmation(
      id,
      parsed.data.templateKey,
      parsed.data.recipient,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, result, 200, 60, {
      reservationId: id,
      method: 'POST',
      path: `/api/admin/reservations/${id}/resend`,
    });

    return apiOk(result, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resend notification.';
    return apiFail(400, message);
  }
}

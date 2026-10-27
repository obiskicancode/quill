import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { checkInReservation } from '@/lib/db/repositories/dashboard.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import type { CheckInOutResponse } from '@/types/dashboard.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.manage',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) {
    return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID_PERIOD);
  }

  try {
    const updatedRow = await checkInReservation(id, guard.context.user.id);
    const response: CheckInOutResponse = { row: updatedRow };
    return apiOk(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CHECK_IN;
    return apiFail(400, message);
  }
}

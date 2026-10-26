import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { listAvailableRoomsForStay } from '@/lib/db/repositories/reservations-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const roomTypeId = url.searchParams.get('roomTypeId');
  const checkIn = url.searchParams.get('checkIn');
  const checkOut = url.searchParams.get('checkOut');
  const excludeReservationId =
    url.searchParams.get('excludeReservationId') ?? undefined;

  if (!roomTypeId || !checkIn || !checkOut) {
    return apiFail(
      400,
      'Missing required parameters: roomTypeId, checkIn, checkOut',
    );
  }

  try {
    const availableRooms = await listAvailableRoomsForStay(
      roomTypeId,
      checkIn,
      checkOut,
      excludeReservationId,
    );
    return apiOk({ rooms: availableRooms }, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to query room availability.';
    return apiFail(400, message);
  }
}

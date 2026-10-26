import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { can } from '@/lib/auth/permissions';
import { hotelClock } from '@/lib/dates';
import { getReservationAdminDetail } from '@/lib/db/repositories/reservations-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import type { ReservationDetail } from '@/types/reservation.types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.view',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) {
    return apiFail(400, 'Missing reservation identifier.');
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  const permissions = {
    canViewGuestContact: can(guard.context.role, 'guest.contact.view'),
    canViewPayments: can(guard.context.role, 'payments.view'),
  };

  try {
    const detail = await getReservationAdminDetail(
      id,
      clock.today,
      permissions,
      new Date(),
      guard.context.role,
    );

    if (!detail) {
      return apiFail(404, 'Reservation not found.');
    }

    return apiOk<ReservationDetail>(detail, { noCache: true });
  } catch (error) {
    console.error('Failed to load reservation detail:', error);
    return apiFail(500, 'Unable to load reservation detail.');
  }
}

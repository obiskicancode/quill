import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getReservationNeighbors } from '@/lib/db/repositories/reservations-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  reservationsListQuerySchema,
  type ReservationNeighbors,
} from '@/types/reservation.types';

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
  if (!id) return apiFail(400, 'Missing reservation ID.');

  const url = new URL(request.url);
  const statusParam = url.searchParams.getAll('status');

  const rawParams = {
    q: url.searchParams.get('q') ?? undefined,
    status: statusParam.length > 0 ? statusParam : undefined,
    dateField: url.searchParams.get('dateField') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    roomTypeId: url.searchParams.get('roomTypeId') ?? undefined,
    roomId: url.searchParams.get('roomId') ?? undefined,
    source: url.searchParams.get('source') ?? undefined,
    paymentState: url.searchParams.get('paymentState') ?? undefined,
    filter: url.searchParams.get('filter') ?? undefined,
    sort: url.searchParams.get('sort') ?? 'check_in',
    order: url.searchParams.get('order') ?? 'asc',
    page: 1,
    pageSize: 500,
  };

  const parsed = reservationsListQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(400, 'Invalid filter parameters.', parsed.error.flatten());
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  try {
    const neighbors = await getReservationNeighbors(
      id,
      parsed.data,
      clock.today,
    );
    return apiOk<ReservationNeighbors>(neighbors, { noCache: true });
  } catch (error) {
    console.error('Failed to get reservation neighbors:', error);
    return apiFail(500, 'Unable to get neighboring reservations.');
  }
}

import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { can } from '@/lib/auth/permissions';
import { hotelClock } from '@/lib/dates';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import {
  adminCreateReservation,
  getFilterOptions,
  getReservationsAdminList,
} from '@/lib/db/repositories/reservations-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  adminCreateReservationSchema,
  reservationsListQuerySchema,
} from '@/schemas/reservation.schema';
import type { ReservationsListResponse } from '@/types/reservation.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.view',
  });
  if (!guard.ok) return guard.response;

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
    page: url.searchParams.get('page') ?? 1,
    pageSize: url.searchParams.get('pageSize') ?? 25,
  };

  const parsed = reservationsListQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(
      400,
      ERROR_MESSAGES.INVALID_RESERVATION_QUERY_FILTERS,
      parsed.error.flatten(),
    );
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  const canViewGuestContact = can(guard.context.role, 'guest.contact.view');

  try {
    const [listResult, options] = await Promise.all([
      getReservationsAdminList(parsed.data, clock.today, canViewGuestContact),
      getFilterOptions(),
    ]);

    const response: ReservationsListResponse = {
      ...listResult,
      appliedFilters: {
        q: parsed.data.q,
        status: parsed.data.status,
        dateField: parsed.data.dateField,
        from: parsed.data.from,
        to: parsed.data.to,
        roomTypeId: parsed.data.roomTypeId,
        roomId: parsed.data.roomId,
        source: parsed.data.source,
        paymentState: parsed.data.paymentState,
        filter: parsed.data.filter,
        sort: parsed.data.sort,
        order: parsed.data.order,
      },
      options,
    };

    return apiOk(response, { noCache: true });
  } catch (error) {
    console.error('Failed to load reservations list:', error);
    return apiFail(500, ERROR_MESSAGES.FAILED_TO_LOAD_RESERVATIONS);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.create',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = adminCreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_RESERVATION_DATA,
      parsed.error.flatten(),
    );
  }

  const idKey = `admin:res:${parsed.data.idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response) {
    return apiOk(previous.response, { status: 200, noCache: true });
  }

  try {
    const created = await adminCreateReservation(
      parsed.data,
      guard.context.user.id,
      guard.context.role,
    );

    await setIdempotency(idKey, created, 201, 60, {
      reservationId: created.id,
      method: 'POST',
      path: '/api/admin/reservations',
    });

    return apiOk(created, { status: 201, noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CREATE_RESERVATION;
    return apiFail(400, message);
  }
}

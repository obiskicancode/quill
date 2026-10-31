import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { todayISO } from '@/lib/dates';
import { getPricingCalendar } from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const roomTypeId = url.searchParams.get('roomTypeId');
  const startDate = url.searchParams.get('startDate') || todayISO();
  const days = parseInt(url.searchParams.get('days') || '90', 10);

  if (!roomTypeId) {
    return apiFail(400, ERROR_MESSAGES.ROOM_TYPE_ID_REQUIRED);
  }

  try {
    const calendar = await getPricingCalendar({
      roomTypeId,
      startDate,
      days,
    });
    return apiOk(calendar, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_GET_PRICE_CALENDAR;
    return apiFail(500, message);
  }
}

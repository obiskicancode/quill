import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getDashboardOccupancy } from '@/lib/db/repositories/dashboard.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { dashboardOccupancyQuerySchema } from '@/schemas/dashboard.schema';
import type { DashboardOccupancyResponse } from '@/types/dashboard.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'dashboard.view' });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = dashboardOccupancyQuerySchema.safeParse({
    from: url.searchParams.get('from') ?? undefined,
    days: url.searchParams.get('days') ?? undefined,
  });

  if (!parsed.success) {
    return apiFail(
      400,
      ERROR_MESSAGES.INVALID_OCCUPANCY_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);
  const startDate = parsed.data.from ?? clock.today;

  try {
    const days = await getDashboardOccupancy(startDate, parsed.data.days);
    const response: DashboardOccupancyResponse = { days };
    return apiOk(response, { noCache: true });
  } catch (error) {
    console.error('Failed to load dashboard occupancy:', error);
    return apiFail(500, ERROR_MESSAGES.FAILED_TO_LOAD_OCCUPANCY);
  }
}

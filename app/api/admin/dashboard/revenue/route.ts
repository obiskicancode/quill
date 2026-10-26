import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import { getDashboardRevenue } from '@/lib/db/repositories/dashboard.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  dashboardRevenueQuerySchema,
  type DashboardRevenueResponse,
} from '@/types/dashboard.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Enforce revenue.view permission on server. Reception users will receive 403 Forbidden.
  const guard = await guardAdminApi(request, { permission: 'revenue.view' });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = dashboardRevenueQuerySchema.safeParse({
    range: url.searchParams.get('range') ?? '7d',
  });

  if (!parsed.success) {
    return apiFail(400, 'Invalid revenue range.', parsed.error.flatten());
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  try {
    const revenue = await getDashboardRevenue(parsed.data.range, clock.today);
    const response: DashboardRevenueResponse = { revenue };
    return apiOk(response, { noCache: true });
  } catch (error) {
    console.error('Failed to load dashboard revenue:', error);
    return apiFail(500, 'Unable to load revenue data.');
  }
}

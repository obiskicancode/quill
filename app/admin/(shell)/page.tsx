import type { Metadata } from 'next';

import { DashboardClient } from '@/components/admin/dashboard/DashboardClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { formatHotelFullDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Hotel operations overview, arrivals, departures and performance.',
};

export default async function AdminDashboardPage() {
  const context = await requireAdminPage('dashboard.view');
  const permissions = ROLE_PERMISSIONS[context.role];

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';

  const formattedToday = formatHotelFullDate(new Date(), timezone);

  return (
    <DashboardClient
      role={context.role}
      permissions={permissions}
      timezone={timezone}
      formattedToday={formattedToday}
    />
  );
}

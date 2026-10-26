import type { Metadata } from 'next';

import { ReservationsClient } from '@/components/admin/reservations/ReservationsClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Reservations',
  description: 'Manage hotel guest bookings, arrivals, and departures.',
};

export default async function AdminReservationsPage() {
  const context = await requireAdminPage('reservations.view');
  const permissions = ROLE_PERMISSIONS[context.role];

  return <ReservationsClient role={context.role} permissions={permissions} />;
}

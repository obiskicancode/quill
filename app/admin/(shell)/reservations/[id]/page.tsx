import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ReservationDetailClient } from '@/components/admin/reservations/detail/ReservationDetailClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { can, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { hotelClock } from '@/lib/dates';
import { getReservationAdminDetail } from '@/lib/db/repositories/reservations-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Reservation ${id}`,
  };
}

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireAdminPage('reservations.view');
  const { id } = await params;
  if (!id) notFound();

  const permissions = ROLE_PERMISSIONS[context.role];
  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  const detailPermissions = {
    canViewGuestContact: can(context.role, 'guest.contact.view'),
    canViewPayments: can(context.role, 'payments.view'),
  };

  const detail = await getReservationAdminDetail(
    id,
    clock.today,
    detailPermissions,
    new Date(),
    context.role,
  );

  if (!detail) {
    notFound();
  }

  return (
    <ReservationDetailClient
      initialDetail={detail}
      reservationId={id}
      role={context.role}
      permissions={permissions}
    />
  );
}

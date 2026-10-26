import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NewReservationClient } from '@/components/admin/reservations/new/NewReservationClient';
import { requireAdminPage } from '@/lib/auth/guards';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import { hotelClock } from '@/lib/dates';
import { listRoomTypes } from '@/lib/db/repositories/rooms.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';

export const metadata: Metadata = {
  title: 'New Reservation | Admin',
};

export default async function AdminNewReservationPage() {
  const context = await requireAdminPage('reservations.create');

  const [types, settings, hotelSetting] = await Promise.all([
    listRoomTypes(true),
    getCheckoutSettings(),
    getHotelSettings(),
  ]);

  const timezone = hotelSetting?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  const serializedRoomTypes = types.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    maxAdults: t.maxAdults,
    maxChildren: t.maxChildren,
    extraBedAvailable: t.extraBedAvailable,
    basePriceMinor: t.basePriceMinor,
  }));

  const serializedExtras = settings.extras.map((e) => ({
    id: e.id,
    name: e.name,
    priceMinor: e.priceMinor,
    unit: e.unit,
    maxQuantity: e.maxQuantity,
  }));

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="text-muted-foreground p-8 text-center">
            Loading form...
          </div>
        }
      >
        <NewReservationClient
          roomTypes={serializedRoomTypes}
          extrasCatalog={serializedExtras}
          role={context.role}
          today={clock.today}
        />
      </Suspense>
    </div>
  );
}

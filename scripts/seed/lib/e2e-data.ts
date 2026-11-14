import { and, eq } from 'drizzle-orm';

import {
  amenities,
  hotelSettings,
  payments,
  reservationNights,
  reservations,
  reservationStatusHistory,
  rooms,
  roomTypeAmenities,
  roomTypes,
} from '@/db/schema';
import { addDays, hotelClock, nightsBetween } from '@/lib/dates';

import { deterministicUuid } from './deterministic';
import { recordSeed, type SeedExecutor } from './seed-records';

const id = (key: string) => deterministicUuid('e2e', key);

export async function runE2EData(
  executor: SeedExecutor,
  now: Date = new Date(),
): Promise<void> {
  const [settings] = await executor
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  const today = hotelClock(now, settings?.timezone ?? 'Africa/Lagos').today;
  const checkIn = addDays(today, 7);
  const checkOut = addDays(today, 9);
  const nights = nightsBetween(checkIn, checkOut);
  const nightlyRate = 50_000_00;
  const total = nightlyRate * nights;

  const roomTypeId = id('room-type');
  const [roomType] = await executor
    .insert(roomTypes)
    .values({
      id: roomTypeId,
      name: 'E2E Room',
      slug: 'e2e-room',
      shortDescription: 'Room type reserved for Playwright tests.',
      description: 'Created by `pnpm seed:e2e`.',
      bedConfig: '1 queen bed',
      maxAdults: 2,
      maxChildren: 0,
      maxOccupancy: 2,
      basePriceMinor: nightlyRate,
      isActive: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: roomTypes.id })
    .returning({ id: roomTypes.id });
  if (roomType) await recordSeed(executor, 'room_types', roomTypeId, 'e2e');

  const roomId = id('room');
  const [room] = await executor
    .insert(rooms)
    .values({
      id: roomId,
      roomTypeId,
      roomNumber: 'E2E-1',
      floor: '1',
      status: 'active',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: rooms.id })
    .returning({ id: rooms.id });
  if (room) await recordSeed(executor, 'rooms', roomId, 'e2e');

  const [wifi] = await executor
    .select({ id: amenities.id })
    .from(amenities)
    .where(eq(amenities.key, 'wifi'))
    .limit(1);
  if (wifi) {
    const [existingLink] = await executor
      .select({ roomTypeId: roomTypeAmenities.roomTypeId })
      .from(roomTypeAmenities)
      .where(
        and(
          eq(roomTypeAmenities.roomTypeId, roomTypeId),
          eq(roomTypeAmenities.amenityId, wifi.id),
        ),
      )
      .limit(1);
    if (!existingLink) {
      await executor.insert(roomTypeAmenities).values({
        roomTypeId,
        amenityId: wifi.id,
        createdAt: now,
      });
      await recordSeed(
        executor,
        'room_type_amenities',
        id('room-type-amenity:wifi'),
        'e2e',
      );
    }
  }

  const reservationId = id('reservation');
  const [reservation] = await executor
    .insert(reservations)
    .values({
      id: reservationId,
      reference: 'E2E-0001',
      roomId,
      roomTypeId,
      guestName: 'E2E Guest',
      guestEmail: 'e2e.guest@example.test',
      guestEmailMissing: false,
      guestPhone: '+2348090000001',
      guestCountry: 'NG',
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      nights,
      status: 'confirmed',
      bookingSource: 'website',
      paymentMode: 'full_online',
      confirmationMode: 'instant',
      channel: 'web',
      subtotalMinor: total,
      extrasMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: total,
      depositRequiredMinor: 0,
      amountPaidMinor: total,
      amountRefundedMinor: 0,
      balanceMinor: 0,
      currency: 'NGN',
      termsAcceptedAt: now,
      termsAcceptedIp: '203.0.113.20',
      confirmedAt: now,
      snapshot: { seed: 'e2e' },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: reservations.id })
    .returning({ id: reservations.id });
  if (!reservation) return;

  await recordSeed(executor, 'reservations', reservationId, 'e2e');

  for (let index = 0; index < nights; index++) {
    const nightId = id(`night:${index}`);
    await executor.insert(reservationNights).values({
      id: nightId,
      reservationId,
      date: addDays(checkIn, index),
      rateMinor: nightlyRate,
      createdAt: now,
    });
    await recordSeed(executor, 'reservation_nights', nightId, 'e2e');
  }

  const historyId = id('history');
  await executor.insert(reservationStatusHistory).values({
    id: historyId,
    reservationId,
    fromStatus: null,
    toStatus: 'confirmed',
    reason: 'E2E seed',
    metadata: { seed: 'e2e' },
    createdAt: now,
  });
  await recordSeed(executor, 'reservation_status_history', historyId, 'e2e');

  const paymentId = id('payment');
  await executor.insert(payments).values({
    id: paymentId,
    reservationId,
    reference: 'E2E-PAY-0001',
    provider: 'paystack',
    type: 'full',
    status: 'paid',
    amountMinor: total,
    currency: 'NGN',
    channel: 'card',
    ipAddress: '203.0.113.20',
    providerRef: 'e2e_provider_1',
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await recordSeed(executor, 'payments', paymentId, 'e2e');
}

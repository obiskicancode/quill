import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { reservationNights, reservations } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { fromISO, hotelClock } from '@/lib/dates';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { calculateRefund } from '@/lib/manage/refund';
import type { ISODate } from '@/types/dates.types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.cancel',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_RESERVATION_ID);

  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!res) return apiFail(404, ERROR_MESSAGES.RESERVATION_NOT_FOUND_BARE);

  const [firstNight] = await db
    .select()
    .from(reservationNights)
    .where(eq(reservationNights.reservationId, id))
    .orderBy(reservationNights.date)
    .limit(1);

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  const freeHours = settings?.freeCancellationHours ?? 48;
  const checkInDate = fromISO(res.checkIn);
  const freeCancellationUntilDate = new Date(
    checkInDate.getTime() - freeHours * 60 * 60 * 1000,
  );

  const netPaidMinor = Math.max(
    0,
    res.amountPaidMinor - res.amountRefundedMinor,
  );

  const refundResult = calculateRefund({
    policy: {
      cancellation: {
        nonRefundable: settings?.cancellationPolicyType === 'non_refundable',
        freeCancellationUntil: {
          date: freeCancellationUntilDate
            .toISOString()
            .split('T')[0] as ISODate,
          time: settings?.checkInTime ?? '14:00',
        },
        note: 'Hotel policy',
      },
      afterDeadline: {
        kind: 'first_night',
      },
    },
    mode: res.paymentMode === 'pay_at_hotel' ? 'pay_at_hotel' : 'full',
    method: null,
    paidMinor: netPaidMinor,
    totalMinor: res.totalMinor,
    firstNightMinor:
      firstNight?.rateMinor ?? res.subtotalMinor / Math.max(1, res.nights),
    clock,
    timelines: { original: '3-5 business days', manual: 'Immediate' },
  });

  return apiOk({
    calculatedRefundMinor: refundResult.refundMinor,
    retainedMinor: refundResult.retainedMinor,
    rule: refundResult.rule,
    maxRefundMinor: netPaidMinor,
  });
}

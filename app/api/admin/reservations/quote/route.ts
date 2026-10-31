import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getRoomTypeById } from '@/lib/db/repositories/rooms.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { reservationQuoteSchema } from '@/schemas/quote.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.view',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = reservationQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_QUOTE_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const {
    roomTypeId,
    checkIn,
    checkOut,
    adults,
    children,
    extraBed,
    extras,
    discount,
  } = parsed.data;

  const rt = await getRoomTypeById(roomTypeId);
  if (!rt) return apiFail(404, ERROR_MESSAGES.ROOM_TYPE_NOT_FOUND);

  try {
    const quote = await buildCheckoutQuote({
      room: rt.slug,
      checkIn,
      checkOut,
      adults,
      children,
      extraBed,
      extras,
    });

    if (quote.status !== 'ok') {
      return apiOk(quote);
    }

    let totalMinor = quote.breakdown.totalMinor;
    let discountMinor = 0;

    if (discount) {
      if (discount.type === 'percentage') {
        discountMinor = Math.round((totalMinor * discount.value) / 100);
      } else {
        discountMinor = Math.round(discount.value * 100);
      }
      totalMinor = Math.max(0, totalMinor - discountMinor);
    }

    const modifiedQuote = {
      ...quote,
      breakdown: {
        ...quote.breakdown,
        discount: discount
          ? {
              label:
                discount.type === 'percentage'
                  ? `Staff Discount (${discount.value}%)`
                  : 'Staff Discount (Fixed)',
              amountMinor: discountMinor,
            }
          : quote.breakdown.discount,
        totalMinor,
      },
    };

    return apiOk(modifiedQuote, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CALCULATE_QUOTE_PERIOD;
    return apiFail(400, message);
  }
}

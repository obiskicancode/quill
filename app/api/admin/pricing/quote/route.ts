import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getAdminRoomTypeById } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminPricingQuoteSchema } from '@/schemas/quote.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = adminPricingQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_QUOTE_PREVIEW_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const { roomTypeId, checkIn, checkOut, adults, children, extraBed } =
    parsed.data;

  const rt = await getAdminRoomTypeById(roomTypeId);
  if (!rt) return apiFail(404, ERROR_MESSAGES.ROOM_TYPE_NOT_FOUND);

  try {
    const quote = await buildCheckoutQuote({
      room: rt.slug,
      checkIn,
      checkOut,
      adults,
      children,
      extraBed,
      extras: [],
    });

    return apiOk(quote);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.INVALID_QUOTE_OR_PARAMS;
    return apiFail(500, message);
  }
}

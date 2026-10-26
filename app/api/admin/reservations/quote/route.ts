import { NextRequest } from 'next/server';
import { z } from 'zod';

import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getRoomTypeById } from '@/lib/db/repositories/rooms.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

const quoteSchema = z.object({
  roomTypeId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  extraBed: z.boolean().default(false),
  extras: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .default([]),
  discount: z
    .object({
      type: z.enum(['fixed', 'percentage']),
      value: z.number().positive(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'reservations.view',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid quote parameters', parsed.error.flatten());
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
  if (!rt) return apiFail(404, 'Room type not found');

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
      error instanceof Error ? error.message : 'Failed to calculate quote.';
    return apiFail(400, message);
  }
}

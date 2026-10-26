import { NextRequest } from 'next/server';
import { z } from 'zod';

import { guardAdminApi } from '@/lib/auth/guards';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { getAdminRoomTypeById } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

const QuotePreviewSchema = z.object({
  roomTypeId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  extraBed: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = QuotePreviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      'Invalid quote preview parameters',
      parsed.error.flatten(),
    );
  }

  const { roomTypeId, checkIn, checkOut, adults, children, extraBed } =
    parsed.data;

  const rt = await getAdminRoomTypeById(roomTypeId);
  if (!rt) return apiFail(404, 'Room type not found');

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
      error instanceof Error ? error.message : 'Failed to calculate quote';
    return apiFail(500, message);
  }
}

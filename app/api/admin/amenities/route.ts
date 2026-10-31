import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  createAdminAmenity,
  listAdminAmenitiesWithUsage,
} from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AmenityInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'amenities.manage',
  });
  if (!guard.ok) return guard.response;

  try {
    const list = await listAdminAmenitiesWithUsage();
    return apiOk(list, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LIST_AMENITIES;
    return apiFail(500, message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'amenities.manage',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = AmenityInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_AMENITY_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    const created = await createAdminAmenity({
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk(created);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CREATE_AMENITY;
    return apiFail(400, message);
  }
}

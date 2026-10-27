import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteAdminAmenity,
  updateAdminAmenity,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminAmenityInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'amenities.manage',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminAmenityInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_AMENITY_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    await updateAdminAmenity({
      id,
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: SUCCESS_MESSAGES.AMENITY_UPDATED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_AMENITY;
    return apiFail(400, message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'amenities.manage',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    await deleteAdminAmenity({
      id,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: SUCCESS_MESSAGES.AMENITY_DELETED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_DELETE_AMENITY;
    return apiFail(400, message);
  }
}

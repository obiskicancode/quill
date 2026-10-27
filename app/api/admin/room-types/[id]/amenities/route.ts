import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { updateRoomTypeAmenities } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { UpdateRoomTypeAmenitiesSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id: roomTypeId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdateRoomTypeAmenitiesSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_AMENITIES_LIST,
      parsed.error.flatten(),
    );
  }

  try {
    await updateRoomTypeAmenities(roomTypeId, parsed.data.amenityIds);
    return apiOk({
      success: true,
      message: SUCCESS_MESSAGES.AMENITIES_UPDATED,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_AMENITIES;
    return apiFail(400, message);
  }
}

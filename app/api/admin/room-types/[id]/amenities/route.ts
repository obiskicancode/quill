import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { updateRoomTypeAmenities } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { UpdateRoomTypeAmenitiesSchema } from '@/types/inventory.types';

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
    return apiFail(422, 'Invalid amenities list', parsed.error.flatten());
  }

  try {
    await updateRoomTypeAmenities(roomTypeId, parsed.data.amenityIds);
    return apiOk({ success: true, message: 'Amenities updated successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update amenities';
    return apiFail(400, message);
  }
}

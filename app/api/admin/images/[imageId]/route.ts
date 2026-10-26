import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteRoomTypeImage,
  updateImageDetails,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminImageUpdateSchema } from '@/types/inventory.types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { imageId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminImageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid image update data', parsed.error.flatten());
  }

  try {
    await updateImageDetails(imageId, parsed.data);
    return apiOk({ success: true, message: 'Image updated successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update image';
    return apiFail(400, message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { imageId } = await params;
  try {
    await deleteRoomTypeImage(imageId);
    return apiOk({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete image';
    return apiFail(400, message);
  }
}

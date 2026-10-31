import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteRoomTypeImage,
  updateImageDetails,
} from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { ImageUpdateSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { imageId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ImageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_IMAGE_UPDATE_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    await updateImageDetails(imageId, parsed.data);
    return apiOk({ success: true, message: SUCCESS_MESSAGES.IMAGE_UPDATED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_IMAGE;
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
    return apiOk({ success: true, message: SUCCESS_MESSAGES.IMAGE_DELETED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_DELETE_IMAGE;
    return apiFail(400, message);
  }
}

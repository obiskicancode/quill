import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteAdminRoomType,
  getAdminRoomTypeById,
  updateAdminRoomTypeDetails,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminRoomTypeInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    const detail = await getAdminRoomTypeById(id);
    if (!detail) {
      return apiFail(404, ERROR_MESSAGES.ROOM_TYPE_NOT_FOUND);
    }
    return apiOk(detail, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_GET_ROOM_TYPE;
    return apiFail(500, message);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminRoomTypeInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_ROOM_TYPE_DETAILS,
      parsed.error.flatten(),
    );
  }

  try {
    await updateAdminRoomTypeDetails({
      id,
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    const updated = await getAdminRoomTypeById(id);
    return apiOk(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_ROOM_TYPE;
    return apiFail(400, message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    await deleteAdminRoomType({
      id,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({
      success: true,
      message: SUCCESS_MESSAGES.ROOM_TYPE_DELETED,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_DELETE_ROOM_TYPE;
    return apiFail(400, message);
  }
}

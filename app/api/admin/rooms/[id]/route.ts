import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteAdminRoom,
  updateAdminRoom,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminRoomUnitInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminRoomUnitInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_ROOM_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    await updateAdminRoom({
      id,
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: SUCCESS_MESSAGES.ROOM_UPDATED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_ROOM;
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
    await deleteAdminRoom({
      id,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: SUCCESS_MESSAGES.ROOM_DELETED });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_DELETE_ROOM_UI;
    return apiFail(400, message);
  }
}

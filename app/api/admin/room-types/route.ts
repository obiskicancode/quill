import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { MAX_ROOM_TYPES } from '@/constants/inventory';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  createAdminRoomType,
  listAdminRoomTypes,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminRoomTypeInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  try {
    const list = await listAdminRoomTypes();
    return apiOk(list, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LIST_ROOM_TYPES;
    return apiFail(500, message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = AdminRoomTypeInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_ROOM_TYPE_DATA,
      parsed.error.flatten(),
    );
  }

  // Soft limit check: MAX_ROOM_TYPES = 8
  const existingList = await listAdminRoomTypes();
  if (existingList.length >= MAX_ROOM_TYPES) {
    // Only owner can override
    if (guard.context.role !== 'owner') {
      return apiFail(
        403,
        ERROR_MESSAGES.ROOM_TYPE_LIMIT_REACHED(MAX_ROOM_TYPES),
      );
    }
  }

  try {
    const created = await createAdminRoomType({
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
        : ERROR_MESSAGES.FAILED_TO_CREATE_ROOM_TYPE;
    return apiFail(400, message);
  }
}

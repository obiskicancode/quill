import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { reorderRoomTypes } from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { ReorderItemsInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = ReorderItemsInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_REORDER_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    await reorderRoomTypes(parsed.data.items, guard.context.user.id);
    return apiOk({
      success: true,
      message: SUCCESS_MESSAGES.ROOM_TYPES_REORDERED,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_REORDER_ROOM_TYPES;
    return apiFail(500, message);
  }
}

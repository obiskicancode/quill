import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  deleteRoomBlockAdmin,
  updateRoomBlockAdmin,
} from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { updateBlockSchema } from '@/schemas/calendar.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.block',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_BLOCK_ID);

  const body = await request.json().catch(() => null);
  const parsed = updateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_BLOCK_UPDATE_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const { roomId, startDate, endDate, reason, notes, backdateReason, version } =
    parsed.data;

  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  // 1. Permission checks on reason
  if (reason === 'owner_hold' || reason === 'renovation') {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(
        403,
        ERROR_MESSAGES.MANAGERS_ONLY_SET_BLOCK_REASON(reason),
      );
    }
  }

  // 2. Permission checks on backdated blocks
  if (startDate < today) {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(403, ERROR_MESSAGES.MANAGERS_ONLY_BACKDATE);
    }
    if (!backdateReason || backdateReason.trim().length === 0) {
      return apiFail(422, ERROR_MESSAGES.BACKDATE_REASON_REQUIRED);
    }
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    undefined;

  try {
    const result = await updateRoomBlockAdmin(
      id,
      {
        roomId,
        startDate,
        endDate,
        reason,
        notes,
        backdateReason,
        version,
      },
      guard.context.user,
      ipAddress,
    );

    if (result.stale) {
      return apiFail(409, ERROR_MESSAGES.BLOCK_VERSION_CONFLICT);
    }

    if (!result.ok) {
      return apiFail(409, ERROR_MESSAGES.SCHEDULING_CONFLICT, {
        conflicts: result.conflicts,
      });
    }

    return apiOk(result.block, { noCache: true });
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    if (errObj.code === '23P01') {
      return apiFail(409, ERROR_MESSAGES.ROOM_BLOCK_UPDATE_CONFLICT, {
        sqlState: '23P01',
      });
    }
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_UPDATE_BLOCK;
    return apiFail(500, message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.block',
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) return apiFail(400, ERROR_MESSAGES.MISSING_BLOCK_ID);

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    undefined;

  try {
    const deleted = await deleteRoomBlockAdmin(
      id,
      guard.context.user,
      ipAddress,
    );
    if (!deleted) {
      return apiFail(404, ERROR_MESSAGES.ROOM_BLOCK_NOT_FOUND);
    }
    return apiOk(
      { success: true, message: SUCCESS_MESSAGES.ROOM_BLOCK_REMOVED },
      { noCache: true },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_DELETE_BLOCK;
    return apiFail(500, message);
  }
}

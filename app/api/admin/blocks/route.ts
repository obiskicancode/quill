import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  bulkCreateRoomBlocks,
  listBlocksPaginated,
} from '@/lib/db/repositories/calendar-admin.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  blocksListQuerySchema,
  createBlockSchema,
} from '@/schemas/calendar.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = blocksListQuerySchema.safeParse({
    page: url.searchParams.get('page') || undefined,
    pageSize: url.searchParams.get('pageSize') || undefined,
    roomTypeId: url.searchParams.get('roomTypeId') || undefined,
    roomId: url.searchParams.get('roomId') || undefined,
    reason: url.searchParams.get('reason') || undefined,
    status: url.searchParams.get('status') || undefined,
  });

  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_QUERY_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  try {
    const list = await listBlocksPaginated({
      ...parsed.data,
      today,
    });
    return apiOk(list, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LIST_BLOCKS;
    return apiFail(500, message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.block',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createBlockSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_BLOCK_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  const {
    roomIds,
    startDate,
    endDate,
    reason,
    notes,
    backdateReason,
    idempotencyKey,
  } = parsed.data;

  const settings = await getHotelSettings();
  const timezone = settings?.timezone || 'Africa/Lagos';
  const { today } = hotelClock(new Date(), timezone);

  if (reason === 'owner_hold' || reason === 'renovation') {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(
        403,
        ERROR_MESSAGES.MANAGERS_ONLY_CREATE_BLOCK_REASON(reason),
      );
    }
  }

  if (startDate < today) {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(403, ERROR_MESSAGES.MANAGERS_ONLY_CREATE_BACKDATE);
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
    const result = await bulkCreateRoomBlocks(
      {
        roomIds,
        startDate,
        endDate,
        reason,
        notes,
        backdateReason,
        idempotencyKey,
      },
      guard.context.user,
      ipAddress,
    );

    if (!result.ok) {
      return apiFail(409, ERROR_MESSAGES.ROOMS_HAVE_CONFLICTS, {
        conflicts: result.conflicts,
      });
    }

    return apiOk(
      {
        count: result.count,
        message: SUCCESS_MESSAGES.BLOCKS_CREATED(result.count),
      },
      { status: 201, noCache: true },
    );
  } catch (error: unknown) {
    // Database exclusion constraint violation check (SQLSTATE 23P01)
    const errObj = error as { code?: string; message?: string };
    if (errObj.code === '23P01') {
      return apiFail(409, ERROR_MESSAGES.ROOM_BLOCK_CREATE_CONFLICT, {
        sqlState: '23P01',
      });
    }
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CREATE_BLOCK;
    return apiFail(500, message);
  }
}

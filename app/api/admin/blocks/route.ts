import { NextRequest } from 'next/server';

import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  bulkCreateRoomBlocks,
  listBlocksPaginated,
} from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import {
  adminBlocksListQuerySchema,
  adminCreateBlockSchema,
} from '@/types/calendar.types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = adminBlocksListQuerySchema.safeParse({
    page: url.searchParams.get('page') || undefined,
    pageSize: url.searchParams.get('pageSize') || undefined,
    roomTypeId: url.searchParams.get('roomTypeId') || undefined,
    roomId: url.searchParams.get('roomId') || undefined,
    reason: url.searchParams.get('reason') || undefined,
    status: url.searchParams.get('status') || undefined,
  });

  if (!parsed.success) {
    return apiFail(422, 'Invalid query parameters', parsed.error.flatten());
  }

  const [settings] = await db
    .select({ timezone: hotelSettings.timezone })
    .from(hotelSettings)
    .limit(1);
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
      error instanceof Error ? error.message : 'Failed to list room blocks.';
    return apiFail(500, message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.block',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = adminCreateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid block parameters', parsed.error.flatten());
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
        `Only managers and owners can create blocks with reason "${reason}".`,
      );
    }
  }

  // 2. Permission checks on backdated blocks
  if (startDate < today) {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(
        403,
        'Only managers and owners can create blocks that start in the past.',
      );
    }
    if (!backdateReason || backdateReason.trim().length === 0) {
      return apiFail(422, 'A reason is required when backdating a room block.');
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
      return apiFail(409, 'One or more rooms have scheduling conflicts.', {
        conflicts: result.conflicts,
      });
    }

    return apiOk(
      {
        count: result.count,
        message: `Successfully created ${result.count} block(s).`,
      },
      { status: 201, noCache: true },
    );
  } catch (error: unknown) {
    // Database exclusion constraint violation check (SQLSTATE 23P01)
    const errObj = error as { code?: string; message?: string };
    if (errObj.code === '23P01') {
      return apiFail(
        409,
        'Cannot create room block due to an overlapping reservation or existing block.',
        { sqlState: '23P01' },
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to create room block.';
    return apiFail(500, message);
  }
}

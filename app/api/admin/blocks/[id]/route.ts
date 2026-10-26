import { NextRequest } from 'next/server';

import { db } from '@/db';
import { hotelSettings } from '@/db/schema';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  deleteRoomBlockAdmin,
  updateRoomBlockAdmin,
} from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminUpdateBlockSchema } from '@/types/calendar.types';

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
  if (!id) return apiFail(400, 'Missing block ID');

  const body = await request.json().catch(() => null);
  const parsed = adminUpdateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      'Invalid block update parameters',
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
        `Only managers and owners can set block reason to "${reason}".`,
      );
    }
  }

  // 2. Permission checks on backdated blocks
  if (startDate < today) {
    if (guard.context.role !== 'owner' && guard.context.role !== 'manager') {
      return apiFail(
        403,
        'Only managers and owners can modify blocks to start in the past.',
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
      return apiFail(
        409,
        'This room block was modified by another user. Please refresh and try again.',
      );
    }

    if (!result.ok) {
      return apiFail(409, 'Scheduling conflict detected.', {
        conflicts: result.conflicts,
      });
    }

    return apiOk(result.block, { noCache: true });
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    if (errObj.code === '23P01') {
      return apiFail(
        409,
        'Cannot update room block due to an overlapping reservation or existing block.',
        { sqlState: '23P01' },
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to update room block.';
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
  if (!id) return apiFail(400, 'Missing block ID');

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
      return apiFail(404, 'Room block not found.');
    }
    return apiOk(
      { success: true, message: 'Room block removed.' },
      { noCache: true },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete room block.';
    return apiFail(500, message);
  }
}

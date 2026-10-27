import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { createAdminRoom } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminCreateRoomPayloadSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = adminCreateRoomPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid room data', parsed.error.flatten());
  }

  const { roomTypeId, ...unitInput } = parsed.data;

  try {
    const created = await createAdminRoom({
      roomTypeId,
      input: unitInput,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk(created);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create room unit';
    return apiFail(400, message);
  }
}

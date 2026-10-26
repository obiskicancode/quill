import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { reorderRoomTypeImages } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { ReorderItemsInputSchema } from '@/types/inventory.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.manage' });
  if (!guard.ok) return guard.response;

  const { id: roomTypeId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ReorderItemsInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid reorder data', parsed.error.flatten());
  }

  try {
    await reorderRoomTypeImages(roomTypeId, parsed.data.items);
    return apiOk({ success: true, message: 'Photos reordered successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reorder photos';
    return apiFail(500, message);
  }
}

import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { reorderAmenities } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { ReorderItemsInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'amenities.manage',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = ReorderItemsInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid reorder data', parsed.error.flatten());
  }

  try {
    await reorderAmenities(parsed.data.items);
    return apiOk({
      success: true,
      message: 'Amenities reordered successfully',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reorder amenities';
    return apiFail(500, message);
  }
}

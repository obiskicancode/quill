import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { checkRoomStatusImpact } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'rooms.view' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    const impact = await checkRoomStatusImpact(id);
    return apiOk(impact, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to check room impact';
    return apiFail(500, message);
  }
}

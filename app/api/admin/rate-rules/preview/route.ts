import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { checkRateRuleOverlap } from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminRateRuleInputSchema } from '@/types/inventory.types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rates.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = AdminRateRuleInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid rate rule data', parsed.error.flatten());
  }

  try {
    const overlapResult = await checkRateRuleOverlap(parsed.data);
    return apiOk(overlapResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to check rate overlap';
    return apiFail(500, message);
  }
}

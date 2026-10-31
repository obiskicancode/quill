import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { checkRateRuleOverlap } from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { RateRuleInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rates.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = RateRuleInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_RATE_RULE_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    const overlapResult = await checkRateRuleOverlap(parsed.data);
    return apiOk(overlapResult);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CHECK_RATE_OVERLAP;
    return apiFail(500, message);
  }
}

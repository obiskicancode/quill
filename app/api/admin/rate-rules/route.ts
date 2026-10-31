import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  createAdminRateRule,
  listAdminRateRules,
} from '@/lib/db/repositories/inventory.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { RateRuleInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'rates.manage' });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const roomTypeId = url.searchParams.get('roomTypeId') || undefined;

  try {
    const list = await listAdminRateRules(roomTypeId);
    return apiOk(list, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LIST_RATE_RULES;
    return apiFail(500, message);
  }
}

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
    const created = await createAdminRateRule({
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk(created);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CREATE_RATE_RULE;
    return apiFail(400, message);
  }
}

import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { checkBlockConflicts } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { blockCheckSchema } from '@/schemas/calendar.schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = blockCheckSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_BLOCK_CHECK_PARAMETERS,
      parsed.error.flatten(),
    );
  }

  try {
    const result = await checkBlockConflicts(parsed.data);
    return apiOk(result, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_CHECK_BLOCK_CONFLICTS;
    return apiFail(500, message);
  }
}

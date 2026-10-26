import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import { checkBlockConflicts } from '@/lib/db/repositories/calendar-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { adminBlockCheckSchema } from '@/types/calendar.types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, {
    permission: 'calendar.view',
  });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = adminBlockCheckSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      'Invalid block check parameters',
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
        : 'Failed to check block conflicts.';
    return apiFail(500, message);
  }
}

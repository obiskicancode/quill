import { NextRequest } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import {
  createAdminExtra,
  listAdminExtras,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminExtraInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'extras.manage' });
  if (!guard.ok) return guard.response;

  try {
    const list = await listAdminExtras();
    return apiOk(list, { noCache: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ERROR_MESSAGES.FAILED_TO_LIST_EXTRAS;
    return apiFail(500, message);
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'extras.manage' });
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = AdminExtraInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(
      422,
      ERROR_MESSAGES.INVALID_EXTRA_DATA,
      parsed.error.flatten(),
    );
  }

  try {
    const created = await createAdminExtra({
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
        : ERROR_MESSAGES.FAILED_TO_CREATE_EXTRA;
    return apiFail(400, message);
  }
}

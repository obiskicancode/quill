import { NextRequest } from 'next/server';

import { guardAdminApi } from '@/lib/auth/guards';
import {
  deleteAdminExtra,
  updateAdminExtra,
} from '@/lib/db/repositories/inventory-admin.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { AdminExtraInputSchema } from '@/schemas/inventory.schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'extras.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AdminExtraInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiFail(422, 'Invalid extra data', parsed.error.flatten());
  }

  try {
    await updateAdminExtra({
      id,
      input: parsed.data,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: 'Extra updated successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update extra';
    return apiFail(400, message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardAdminApi(request, { permission: 'extras.manage' });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    await deleteAdminExtra({
      id,
      actorId: guard.context.user.id,
      actorRole: guard.context.role,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });
    return apiOk({ success: true, message: 'Extra deleted successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete extra';
    return apiFail(400, message);
  }
}

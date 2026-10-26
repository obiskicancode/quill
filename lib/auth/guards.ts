import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { can, ROLE_PERMISSIONS, type Permission } from '@/lib/auth/permissions';
import {
  isMfaPending,
  resolveAdminSession,
  type AdminContext,
} from '@/lib/auth/session';
import { apiFail } from '@/lib/http/envelope';

export type AdminGuardResult =
  | { ok: true; context: AdminContext }
  | { ok: false; response: ReturnType<typeof apiFail> };

export async function readAdminContext(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const request = new Request('http://admin.local/', {
    headers: { cookie: cookieStore.toString() },
  });
  return resolveAdminSession(request);
}

export async function requireAdminPage(
  permission?: Permission,
  options: { allowPending?: boolean } = {},
): Promise<AdminContext> {
  const context = await readAdminContext();
  if (!context) redirect('/admin/login');
  if (isMfaPending(context) && !options.allowPending) {
    redirect('/admin/account?setup=required');
  }
  if (!can(context.role, permission)) redirect('/admin/forbidden');
  return context;
}

export function canAccess(
  context: AdminContext,
  permission: Permission,
): boolean {
  return can(context.role, permission);
}

export function permissionsFor(context: AdminContext): readonly Permission[] {
  return ROLE_PERMISSIONS[context.role];
}

export async function guardAdminApi(
  request: Request,
  options: { permission?: Permission; allowPending?: boolean } = {},
): Promise<AdminGuardResult> {
  const context = await resolveAdminSession(request);
  if (!context) {
    return {
      ok: false,
      response: apiFail(
        401,
        ERROR_MESSAGES.ADMIN_SESSION_EXPIRED,
        { code: ERROR_CODES.SESSION_EXPIRED },
        { noCache: true },
      ),
    };
  }

  if (isMfaPending(context) && !options.allowPending) {
    return {
      ok: false,
      response: apiFail(
        403,
        ERROR_MESSAGES.ADMIN_MFA_SETUP_REQUIRED,
        { code: ERROR_CODES.MFA_SETUP_REQUIRED, setupRequired: true },
        { noCache: true },
      ),
    };
  }

  if (options.permission && !can(context.role, options.permission)) {
    return {
      ok: false,
      response: apiFail(
        403,
        ERROR_MESSAGES.ADMIN_FORBIDDEN,
        { code: ERROR_CODES.NOT_ALLOWED },
        { noCache: true },
      ),
    };
  }

  return { ok: true, context };
}

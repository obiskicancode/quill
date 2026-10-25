import { apiFail } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { ManageApiError } from '@/types/manage.types';

import { getManageSession } from '../booking/session';
import { rateLimit } from '../rate-limit';

const noStore = { 'Cache-Control': 'no-store' };

export const manageError = (status: number, error: ManageApiError) =>
  apiFail(status, error.message, error, { headers: noStore });

/**
 * Every change needs: a live manage session cookie, a matching CSRF token and a rate-limit pass.
 */
export async function requireManage(
  req: Request,
  reference: string,
): Promise<{ ok: true } | { ok: false; res: Response }> {
  const client =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!(await rateLimit(`manage:${client}`, 40, 60_000)).allowed) {
    return {
      ok: false,
      res: manageError(429, {
        code: ERROR_CODES.RATE_LIMITED,
        message: ERROR_MESSAGES.MANAGE_RATE_LIMITED,
        retryAfterSeconds: 60,
      }),
    };
  }
  const session = await getManageSession(reference);
  if (!session)
    return {
      ok: false,
      res: manageError(401, {
        code: ERROR_CODES.SESSION_EXPIRED,
        message: ERROR_MESSAGES.SESSION_EXPIRED,
      }),
    };
  if (req.headers.get('x-csrf-token') !== session.csrf)
    return {
      ok: false,
      res: manageError(403, {
        code: ERROR_CODES.CSRF,
        message: ERROR_MESSAGES.CSRF_FAILED,
      }),
    };
  return { ok: true };
}

/** Replays the stored answer when the same idempotency key arrives again, so a retry can never repeat a change. */
export const replayKey = (scope: string, key: string) => `${scope}:${key}`;

/** The session details a manage view needs (CSRF token and expiry). */
export async function manageOpts(
  reference: string,
): Promise<{ csrf: string; expiresAt: number } | undefined> {
  const session = await getManageSession(reference);
  return session
    ? { csrf: session.csrf, expiresAt: session.expiresAt }
    : undefined;
}

import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { AdminContext } from '@/lib/auth/session';
import { apiFail } from '@/lib/http/envelope';
import { isStepUpRequired } from '@/lib/staff/guard-rails';

export type StepUpCheckResult =
  { ok: true } | { ok: false; response: ReturnType<typeof apiFail> };

/**
 * Server guard for sensitive endpoints.
 * Returns a 403 envelope response with STEP_UP_REQUIRED code if step-up authentication is stale (>15 mins).
 */
export function requireStepUp(context: AdminContext): StepUpCheckResult {
  if (isStepUpRequired(context.stepUpVerifiedAt, 15)) {
    return {
      ok: false,
      response: apiFail(
        403,
        ERROR_MESSAGES.ADMIN_STEP_UP_REQUIRED,
        { code: ERROR_CODES.STEP_UP_REQUIRED },
        { noCache: true },
      ),
    };
  }

  return { ok: true };
}

/**
 * Step-up authentication gate for sensitive admin actions. A session must have
 * re-verified recently; stale sessions receive a typed 403 so the client can
 * open the step-up dialog.
 */
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { AdminContext } from '@/lib/auth/session';
import { apiFail } from '@/lib/http/envelope';
import { isStepUpRequired } from '@/lib/staff/guard-rails';

/** Result of a step-up check: success or a ready-to-return error response. */
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

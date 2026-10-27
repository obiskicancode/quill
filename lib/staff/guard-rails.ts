import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { AdminRole } from '@/types/auth.types';

export interface GuardRailResult {
  ok: boolean;
  code?: string;
  message?: string;
}

/**
 * Validates that a staff member's role can be updated.
 * Guard rails:
 * - A user cannot change their own role in the staff directory.
 * - The last active owner can never be demoted.
 */
export function validateStaffRoleChange(params: {
  actorId: string;
  targetUserId: string;
  targetUserRole: AdminRole;
  newRole: AdminRole;
  activeOwnerCount: number;
}): GuardRailResult {
  const { actorId, targetUserId, targetUserRole, newRole, activeOwnerCount } =
    params;

  if (actorId === targetUserId) {
    return {
      ok: false,
      code: ERROR_CODES.CANNOT_CHANGE_OWN_ROLE,
      message: ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE,
    };
  }

  if (targetUserRole === 'owner' && newRole !== 'owner') {
    if (activeOwnerCount <= 1) {
      return {
        ok: false,
        code: ERROR_CODES.CANNOT_DEMOTE_LAST_OWNER,
        message: ERROR_MESSAGES.CANNOT_DEMOTE_LAST_OWNER,
      };
    }
  }

  return { ok: true };
}

/**
 * Validates that a staff member can be deactivated.
 * Guard rails:
 * - A user cannot deactivate themselves.
 * - The last active owner can never be deactivated.
 */
export function validateStaffDeactivation(params: {
  actorId: string;
  targetUserId: string;
  targetUserRole: AdminRole;
  activeOwnerCount: number;
}): GuardRailResult {
  const { actorId, targetUserId, targetUserRole, activeOwnerCount } = params;

  if (actorId === targetUserId) {
    return {
      ok: false,
      code: ERROR_CODES.CANNOT_DEACTIVATE_SELF,
      message: ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF,
    };
  }

  if (targetUserRole === 'owner') {
    if (activeOwnerCount <= 1) {
      return {
        ok: false,
        code: ERROR_CODES.CANNOT_DEACTIVATE_LAST_OWNER,
        message: ERROR_MESSAGES.CANNOT_DEACTIVATE_LAST_OWNER,
      };
    }
  }

  return { ok: true };
}

/**
 * Validates that a staff member's 2FA can be reset.
 * Guard rails:
 * - The last active owner's 2FA cannot be reset if no other active owner can administer the system.
 */
export function validateStaffMfaReset(params: {
  actorId: string;
  targetUserId: string;
  targetUserRole: AdminRole;
  activeOwnerCount: number;
}): GuardRailResult {
  const { targetUserRole, activeOwnerCount } = params;

  if (targetUserRole === 'owner' && activeOwnerCount <= 1) {
    return {
      ok: false,
      code: ERROR_CODES.CANNOT_RESET_MFA_LAST_OWNER,
      message: ERROR_MESSAGES.CANNOT_RESET_MFA_LAST_OWNER,
    };
  }

  return { ok: true };
}

/**
 * Validates staff invitation email uniqueness.
 */
export function validateStaffInvite(params: {
  email: string;
  existingStaffEmails: string[];
}): GuardRailResult {
  const normalized = params.email.trim().toLowerCase();
  const exists = params.existingStaffEmails.some(
    (e) => e.trim().toLowerCase() === normalized,
  );

  if (exists) {
    return {
      ok: false,
      code: ERROR_CODES.EMAIL_ALREADY_IN_USE,
      message: ERROR_MESSAGES.EMAIL_ALREADY_IN_USE,
    };
  }

  return { ok: true };
}

/**
 * Validates whether step-up authentication is satisfied.
 * Requires verification within the last maxAgeMinutes (default 15 minutes).
 */
export function isStepUpRequired(
  stepUpVerifiedAt: Date | null | undefined,
  maxAgeMinutes = 15,
): boolean {
  if (!stepUpVerifiedAt) return true;
  const elapsedMs = Date.now() - new Date(stepUpVerifiedAt).getTime();
  return elapsedMs > maxAgeMinutes * 60 * 1000;
}

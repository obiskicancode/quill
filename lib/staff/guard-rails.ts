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
      code: 'CANNOT_CHANGE_OWN_ROLE',
      message:
        'You cannot change your own role. Contact another owner or manage your account on your profile page.',
    };
  }

  if (targetUserRole === 'owner' && newRole !== 'owner') {
    if (activeOwnerCount <= 1) {
      return {
        ok: false,
        code: 'CANNOT_DEMOTE_LAST_OWNER',
        message:
          'The last active owner cannot be demoted. Promote another active staff member to owner first.',
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
      code: 'CANNOT_DEACTIVATE_SELF',
      message: 'You cannot deactivate your own account.',
    };
  }

  if (targetUserRole === 'owner') {
    if (activeOwnerCount <= 1) {
      return {
        ok: false,
        code: 'CANNOT_DEACTIVATE_LAST_OWNER',
        message:
          'The last active owner cannot be deactivated. There must always be at least one active owner.',
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
      code: 'CANNOT_RESET_MFA_LAST_OWNER',
      message:
        'Cannot reset 2FA for the only active owner without another active owner on record.',
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
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'That email is already in use by another staff member.',
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

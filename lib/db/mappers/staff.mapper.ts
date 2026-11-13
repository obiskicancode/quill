/** Maps staff and session database records into the auth-facing types. */

import type { StaffSession, StaffUser } from '@/db/types';
import type { Session } from '@/types/auth.types';
import type { Staff } from '@/types/staff.types';

/** Maps a staff user, serializing the last login timestamp to ISO or null. */
export function toStaff(staff: StaffUser): Staff {
  return {
    id: staff.id,
    email: staff.email,
    firstName: staff.firstName,
    lastName: staff.lastName,
    role: staff.role,
    phone: staff.phone,
    mfaEnabled: staff.mfaEnabled,
    lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
  };
}

/**
 * Maps a staff session, serializing timestamps and marking it current when its
 * id matches `currentSessionId`.
 */
export function toSession(
  session: StaffSession,
  currentSessionId: string,
): Session {
  return {
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    lastSeenAt: session.lastSeenAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    current: session.id === currentSessionId,
  };
}

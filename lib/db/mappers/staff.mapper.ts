import type { StaffSession, StaffUser } from '@/db/types';
import type { AdminSession, AdminStaff } from '@/types/admin.types';

export function toAdminStaff(staff: StaffUser): AdminStaff {
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

export function toAdminSession(
  session: StaffSession,
  currentSessionId: string,
): AdminSession {
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

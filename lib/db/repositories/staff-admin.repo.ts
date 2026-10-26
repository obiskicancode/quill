import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  auditLogs,
  passwordResetTokens,
  staffRecoveryCodes,
  staffSessions,
  staffUsers,
} from '@/db/schema';
import type { StaffUser } from '@/db/types';
import { hashToken, randomToken } from '@/lib/auth/crypto';
import { recordAuditLog } from '@/lib/db/repositories/audit.repo';
import {
  sendAdminPasswordResetEmail,
  sendSecurityAlertEmail,
  sendStaffInvitationEmail,
} from '@/lib/mail';
import {
  validateStaffDeactivation,
  validateStaffInvite,
  validateStaffMfaReset,
  validateStaffRoleChange,
} from '@/lib/staff/guard-rails';
import type {
  StaffDetailResponse,
  StaffInviteInput,
  StaffListItem,
  StaffQueryParams,
  StaffUpdateInput,
} from '@/types/staff-admin.types';

export async function getActiveOwnerCount(): Promise<number> {
  const res = await db
    .select({ count: sql<number>`count(*)` })
    .from(staffUsers)
    .where(and(eq(staffUsers.role, 'owner'), eq(staffUsers.isActive, true)));
  return Number(res[0]?.count || 1);
}

export async function getAllActiveOwnerEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: staffUsers.email })
    .from(staffUsers)
    .where(and(eq(staffUsers.role, 'owner'), eq(staffUsers.isActive, true)));
  return rows.map((r) => r.email);
}

export async function listStaffRepo(
  params: StaffQueryParams,
): Promise<StaffListItem[]> {
  const conditions = [];

  if (params.role && params.role !== 'all') {
    conditions.push(
      eq(staffUsers.role, params.role as 'reception' | 'manager' | 'owner'),
    );
  }

  if (params.status === 'active') {
    conditions.push(
      and(
        eq(staffUsers.isActive, true),
        or(
          sql`${staffUsers.lockedUntil} IS NULL`,
          sql`${staffUsers.lockedUntil} <= now()`,
        ),
        sql`${staffUsers.passwordHash} IS NOT NULL`,
      ),
    );
  } else if (params.status === 'invited') {
    conditions.push(
      and(
        eq(staffUsers.isActive, true),
        sql`${staffUsers.passwordHash} IS NULL`,
      ),
    );
  } else if (params.status === 'deactivated') {
    conditions.push(eq(staffUsers.isActive, false));
  } else if (params.status === 'locked') {
    conditions.push(
      and(
        eq(staffUsers.isActive, true),
        sql`${staffUsers.lockedUntil} > now()`,
      ),
    );
  }

  if (params.q) {
    conditions.push(
      or(
        ilike(staffUsers.firstName, `%${params.q}%`),
        ilike(staffUsers.lastName, `%${params.q}%`),
        ilike(staffUsers.email, `%${params.q}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(staffUsers)
    .where(whereClause)
    .orderBy(desc(staffUsers.createdAt));

  const now = new Date();
  return rows.map((u) => {
    let status: 'active' | 'invited' | 'deactivated' | 'locked' = 'active';
    if (!u.isActive) {
      status = 'deactivated';
    } else if (u.lockedUntil && u.lockedUntil > now) {
      status = 'locked';
    } else if (!u.passwordHash && u.invitedAt) {
      status = 'invited';
    }

    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      status,
      phone: u.phone,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      lastLoginIp: u.lastLoginIp,
      invitedAt: u.invitedAt?.toISOString() || null,
      deactivatedAt: u.deactivatedAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  });
}

export async function getStaffDetailRepo(
  id: string,
): Promise<StaffDetailResponse | null> {
  const [u] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, id))
    .limit(1);

  if (!u) return null;

  let invitedByName: string | null = null;
  if (u.invitedBy) {
    const [inviter] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, u.invitedBy))
      .limit(1);
    if (inviter) invitedByName = `${inviter.firstName} ${inviter.lastName}`;
  }

  let deactivatedByName: string | null = null;
  if (u.deactivatedBy) {
    const [deactivator] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, u.deactivatedBy))
      .limit(1);
    if (deactivator)
      deactivatedByName = `${deactivator.firstName} ${deactivator.lastName}`;
  }

  const sessions = await db
    .select()
    .from(staffSessions)
    .where(
      and(
        eq(staffSessions.staffUserId, u.id),
        sql`${staffSessions.revokedAt} IS NULL`,
      ),
    )
    .orderBy(desc(staffSessions.createdAt))
    .limit(10);

  const audits = await db
    .select()
    .from(auditLogs)
    .where(or(eq(auditLogs.actorId, u.id), eq(auditLogs.entityId, u.id)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  const now = new Date();
  let status: 'active' | 'invited' | 'deactivated' | 'locked' = 'active';
  if (!u.isActive) {
    status = 'deactivated';
  } else if (u.lockedUntil && u.lockedUntil > now) {
    status = 'locked';
  } else if (!u.passwordHash && u.invitedAt) {
    status = 'invited';
  }

  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    status,
    phone: u.phone,
    mfaEnabled: u.mfaEnabled,
    lastLoginAt: u.lastLoginAt?.toISOString() || null,
    lastLoginIp: u.lastLoginIp,
    invitedAt: u.invitedAt?.toISOString() || null,
    deactivatedAt: u.deactivatedAt?.toISOString() || null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    invitedByName,
    deactivatedByName,
    activeSessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceLabel: s.userAgent ? s.userAgent.slice(0, 40) : 'Web Browser',
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt?.toISOString() || null,
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: false,
    })),
    recentAudits: audits.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      summary: a.reason || `${a.action} on ${a.entity}`,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function inviteStaffRepo(params: {
  input: StaffInviteInput;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; staffId?: string; error?: string }> {
  const { input, actor, ipAddress } = params;

  const existing = await db
    .select({ email: staffUsers.email })
    .from(staffUsers);

  const validation = validateStaffInvite({
    email: input.email,
    existingStaffEmails: existing.map((e) => e.email),
  });

  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  const token = randomToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours single use

  try {
    const [newStaff] = await db
      .insert(staffUsers)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        role: input.role,
        phone: input.phone || null,
        isActive: true,
        invitedBy: actor.id,
        invitedAt: new Date(),
        inviteExpiresAt: expiresAt,
      })
      .returning();

    await db.insert(passwordResetTokens).values({
      staffUserId: newStaff.id,
      tokenHash,
      purpose: 'invite',
      expiresAt,
    });

    await sendStaffInvitationEmail({
      staff: newStaff,
      token,
      expiresAt,
      invitedByName: `${actor.firstName} ${actor.lastName}`,
    });

    if (input.role === 'owner') {
      const ownerEmails = await getAllActiveOwnerEmails();
      await sendSecurityAlertEmail({
        toOwnerEmails: ownerEmails,
        action: 'Invited new Owner account',
        targetStaffName: `${input.firstName} ${input.lastName} (${input.email})`,
        actorName: `${actor.firstName} ${actor.lastName}`,
        ipAddress,
      });
    }

    await recordAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      entity: 'staff_user',
      entityId: newStaff.id,
      action: 'invite',
      reason: `Invited new ${input.role}: ${input.firstName} ${input.lastName}`,
      ipAddress,
    });

    return { ok: true, staffId: newStaff.id };
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    if (errObj?.code === '23505') {
      return {
        ok: false,
        error: 'That email is already in use by another staff member.',
      };
    }
    return {
      ok: false,
      error: errObj?.message || 'Failed to create staff invitation',
    };
  }
}

export async function updateStaffRepo(params: {
  id: string;
  input: StaffUpdateInput;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { id, input, actor, ipAddress } = params;

  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, id))
    .limit(1);

  if (!target) {
    return { ok: false, error: 'Staff member not found' };
  }

  if (input.role !== target.role) {
    const ownerCount = await getActiveOwnerCount();
    const roleValidation = validateStaffRoleChange({
      actorId: actor.id,
      targetUserId: target.id,
      targetUserRole: target.role,
      newRole: input.role,
      activeOwnerCount: ownerCount,
    });

    if (!roleValidation.ok) {
      return { ok: false, error: roleValidation.message };
    }

    // Revoke sessions immediately so new role takes effect on next request
    await db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(eq(staffSessions.staffUserId, target.id));

    const ownerEmails = await getAllActiveOwnerEmails();
    await sendSecurityAlertEmail({
      toOwnerEmails: ownerEmails,
      action: `Role changed from ${target.role} to ${input.role}`,
      targetStaffName: `${target.firstName} ${target.lastName}`,
      actorName: `${actor.firstName} ${actor.lastName}`,
      ipAddress,
    });
  }

  await db
    .update(staffUsers)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      role: input.role,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id));

  await recordAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    entity: 'staff_user',
    entityId: id,
    action: 'update',
    reason: `Updated profile and role to ${input.role}`,
    ipAddress,
  });

  return { ok: true };
}

export async function deactivateStaffRepo(params: {
  id: string;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { id, actor, ipAddress } = params;

  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, id))
    .limit(1);

  if (!target) {
    return { ok: false, error: 'Staff member not found' };
  }

  const ownerCount = await getActiveOwnerCount();
  const validation = validateStaffDeactivation({
    actorId: actor.id,
    targetUserId: target.id,
    targetUserRole: target.role,
    activeOwnerCount: ownerCount,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  await db
    .update(staffUsers)
    .set({
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id));

  // Revoke all sessions immediately
  await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(eq(staffSessions.staffUserId, id));

  const ownerEmails = await getAllActiveOwnerEmails();
  await sendSecurityAlertEmail({
    toOwnerEmails: ownerEmails,
    action: 'Account Deactivated',
    targetStaffName: `${target.firstName} ${target.lastName}`,
    actorName: `${actor.firstName} ${actor.lastName}`,
    ipAddress,
  });

  await recordAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    entity: 'staff_user',
    entityId: id,
    action: 'deactivate',
    reason: 'Staff account deactivated and all active sessions revoked',
    ipAddress,
  });

  return { ok: true };
}

export async function reactivateStaffRepo(params: {
  id: string;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { id, actor, ipAddress } = params;

  await db
    .update(staffUsers)
    .set({
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id));

  await recordAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    entity: 'staff_user',
    entityId: id,
    action: 'reactivate',
    reason: 'Staff account reactivated',
    ipAddress,
  });

  return { ok: true };
}

export async function unlockStaffRepo(params: {
  id: string;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean }> {
  await db
    .update(staffUsers)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, params.id));

  await recordAuditLog({
    actorId: params.actor.id,
    actorRole: params.actor.role,
    entity: 'staff_user',
    entityId: params.id,
    action: 'unlock',
    reason: 'Staff account unlocked',
    ipAddress: params.ipAddress,
  });

  return { ok: true };
}

export async function revokeAllSessionsForStaffRepo(params: {
  id: string;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean }> {
  await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(eq(staffSessions.staffUserId, params.id));

  await recordAuditLog({
    actorId: params.actor.id,
    actorRole: params.actor.role,
    entity: 'staff_session',
    entityId: params.id,
    action: 'revoke_all',
    reason: 'All sessions revoked by admin',
    ipAddress: params.ipAddress,
  });

  return { ok: true };
}

export async function resetStaffMfaRepo(params: {
  id: string;
  actor: StaffUser;
  ipAddress?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { id, actor, ipAddress } = params;

  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, id))
    .limit(1);

  if (!target) {
    return { ok: false, error: 'Staff member not found' };
  }

  const ownerCount = await getActiveOwnerCount();
  const validation = validateStaffMfaReset({
    actorId: actor.id,
    targetUserId: target.id,
    targetUserRole: target.role,
    activeOwnerCount: ownerCount,
  });

  if (!validation.ok) return { ok: false, error: validation.message };

  await db
    .update(staffUsers)
    .set({
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id));

  await db
    .delete(staffRecoveryCodes)
    .where(eq(staffRecoveryCodes.staffUserId, id));

  const ownerEmails = await getAllActiveOwnerEmails();
  await sendSecurityAlertEmail({
    toOwnerEmails: ownerEmails,
    action: 'Two-factor authentication reset',
    targetStaffName: `${target.firstName} ${target.lastName}`,
    actorName: `${actor.firstName} ${actor.lastName}`,
    ipAddress,
  });

  await recordAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    entity: 'mfa',
    entityId: id,
    action: 'reset_2fa',
    reason: 'Two-factor secret and recovery codes cleared',
    ipAddress,
  });

  return { ok: true };
}

export async function sendPasswordResetRepo(params: {
  id: string;
  actor: StaffUser;
}): Promise<{ ok: boolean; error?: string }> {
  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, params.id))
    .limit(1);

  if (!target) {
    return { ok: false, error: 'Staff member not found' };
  }

  const token = randomToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    staffUserId: target.id,
    tokenHash,
    purpose: 'reset',
    expiresAt,
  });

  await sendAdminPasswordResetEmail({
    staff: target,
    token,
    expiresAt,
  });

  await recordAuditLog({
    actorId: params.actor.id,
    actorRole: params.actor.role,
    entity: 'staff_user',
    entityId: params.id,
    action: 'password_reset_sent',
    reason: 'Password reset link sent by owner',
  });

  return { ok: true };
}

export async function resendInviteRepo(params: {
  id: string;
  actor: StaffUser;
}): Promise<{ ok: boolean; error?: string }> {
  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, params.id))
    .limit(1);

  if (!target) return { ok: false, error: 'Staff member not found' };

  // Invalidate existing tokens
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.staffUserId, target.id),
        eq(passwordResetTokens.purpose, 'invite'),
      ),
    );

  const token = randomToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    staffUserId: target.id,
    tokenHash,
    purpose: 'invite',
    expiresAt,
  });

  await sendStaffInvitationEmail({
    staff: target,
    token,
    expiresAt,
    invitedByName: `${params.actor.firstName} ${params.actor.lastName}`,
  });

  return { ok: true };
}

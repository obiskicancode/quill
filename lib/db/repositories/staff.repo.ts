import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  passwordResetTokens,
  staffRecoveryCodes,
  staffSessions,
  staffUsers,
} from '@/db/schema';
import type {
  NewPasswordResetToken,
  NewStaffRecoveryCode,
  NewStaffSession,
  NewStaffUser,
  PasswordResetToken,
  StaffRecoveryCode,
  StaffSession,
  StaffUser,
} from '@/db/types';

export async function findStaffByEmail(
  email: string,
): Promise<StaffUser | null> {
  const [row] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);
  return row ?? null;
}

export async function findStaffById(id: string): Promise<StaffUser | null> {
  const [row] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, id))
    .limit(1);
  return row ?? null;
}

export const MAX_FAILED_LOGINS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60_000;

export async function registerFailedLogin(
  id: string,
): Promise<{ staff: StaffUser; locked: boolean }> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, id))
      .for('update');
    if (!current) throw new Error('Staff user not found');

    const failedLoginCount = Math.min(current.failedLoginCount + 1, 32767);
    const locked = failedLoginCount >= MAX_FAILED_LOGINS;
    const [staff] = await tx
      .update(staffUsers)
      .set({
        failedLoginCount,
        lockedUntil: locked
          ? new Date(Date.now() + LOGIN_LOCKOUT_MS)
          : current.lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(staffUsers.id, id))
      .returning();
    return { staff, locked };
  });
}

export async function recordSuccessfulLogin(
  id: string,
  ipAddress: string | null,
): Promise<StaffUser | null> {
  const [row] = await db
    .update(staffUsers)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id))
    .returning();
  return row ?? null;
}

export async function setMfaSecret(
  id: string,
  encryptedSecret: string,
): Promise<StaffUser | null> {
  const [row] = await db
    .update(staffUsers)
    .set({
      mfaSecretEncrypted: encryptedSecret,
      mfaEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id))
    .returning();
  return row ?? null;
}

export async function setMfaEnabled(
  id: string,
  enabled: boolean,
): Promise<StaffUser | null> {
  const [row] = await db
    .update(staffUsers)
    .set({
      mfaEnabled: enabled,
      mfaSecretEncrypted: enabled ? undefined : null,
      updatedAt: new Date(),
    })
    .where(eq(staffUsers.id, id))
    .returning();
  return row ?? null;
}

export async function listStaffUsers(activeOnly = false): Promise<StaffUser[]> {
  if (activeOnly) {
    return db.select().from(staffUsers).where(eq(staffUsers.isActive, true));
  }
  return db.select().from(staffUsers);
}

export async function createStaff(data: NewStaffUser): Promise<StaffUser> {
  const [row] = await db.insert(staffUsers).values(data).returning();
  return row;
}

export async function updateStaff(
  id: string,
  data: Partial<NewStaffUser>,
): Promise<StaffUser | null> {
  const [row] = await db
    .update(staffUsers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(staffUsers.id, id))
    .returning();
  return row ?? null;
}

export async function createSession(
  data: NewStaffSession,
): Promise<StaffSession> {
  const [row] = await db.insert(staffSessions).values(data).returning();
  return row;
}

export async function findSessionById(
  id: string,
): Promise<StaffSession | null> {
  const [row] = await db
    .select()
    .from(staffSessions)
    .where(eq(staffSessions.id, id))
    .limit(1);
  return row ?? null;
}

export async function findSessionByTokenHash(
  sessionTokenHash: string,
): Promise<StaffSession | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(staffSessions)
    .where(
      and(
        eq(staffSessions.sessionTokenHash, sessionTokenHash),
        gt(staffSessions.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row || row.revokedAt) return null;
  return row;
}

export async function findAnySessionByTokenHash(
  sessionTokenHash: string,
): Promise<StaffSession | null> {
  const [row] = await db
    .select()
    .from(staffSessions)
    .where(eq(staffSessions.sessionTokenHash, sessionTokenHash))
    .limit(1);
  return row ?? null;
}

export async function listActiveSessionsForUser(
  staffUserId: string,
): Promise<StaffSession[]> {
  const now = new Date();
  return db
    .select()
    .from(staffSessions)
    .where(
      and(
        eq(staffSessions.staffUserId, staffUserId),
        isNull(staffSessions.revokedAt),
        gt(staffSessions.expiresAt, now),
      ),
    );
}

export async function revokeOtherSessionsForUser(
  staffUserId: string,
  currentSessionId: string,
): Promise<number> {
  const rows = await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(staffSessions.staffUserId, staffUserId),
        ne(staffSessions.id, currentSessionId),
        isNull(staffSessions.revokedAt),
      ),
    )
    .returning({ id: staffSessions.id });
  return rows.length;
}

export async function markSessionStepUp(
  id: string,
  at = new Date(),
): Promise<StaffSession | null> {
  const [row] = await db
    .update(staffSessions)
    .set({ stepUpVerifiedAt: at, lastSeenAt: new Date() })
    .where(eq(staffSessions.id, id))
    .returning();
  return row ?? null;
}

export async function revokeSession(
  sessionId: string,
): Promise<StaffSession | null> {
  const [row] = await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(eq(staffSessions.id, sessionId))
    .returning();
  return row ?? null;
}

export async function revokeAllSessionsForUser(
  staffUserId: string,
): Promise<void> {
  await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(eq(staffSessions.staffUserId, staffUserId));
}

export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db
    .delete(staffSessions)
    .where(sql`${now} > ${staffSessions.expiresAt}`);
}

export async function createRecoveryCodes(
  codes: NewStaffRecoveryCode[],
): Promise<StaffRecoveryCode[]> {
  if (codes.length === 0) return [];
  return db.insert(staffRecoveryCodes).values(codes).returning();
}

export async function findRecoveryCodesForUser(
  staffUserId: string,
): Promise<StaffRecoveryCode[]> {
  return db
    .select()
    .from(staffRecoveryCodes)
    .where(eq(staffRecoveryCodes.staffUserId, staffUserId));
}

export async function findUnusedRecoveryCodesForUser(
  staffUserId: string,
): Promise<StaffRecoveryCode[]> {
  return db
    .select()
    .from(staffRecoveryCodes)
    .where(
      and(
        eq(staffRecoveryCodes.staffUserId, staffUserId),
        isNull(staffRecoveryCodes.usedAt),
      ),
    );
}

export async function replaceRecoveryCodes(
  staffUserId: string,
  codes: NewStaffRecoveryCode[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(staffRecoveryCodes)
      .where(eq(staffRecoveryCodes.staffUserId, staffUserId));
    if (codes.length > 0) {
      await tx.insert(staffRecoveryCodes).values(codes);
    }
  });
}

export async function markRecoveryCodeUsed(
  id: string,
): Promise<StaffRecoveryCode | null> {
  const [row] = await db
    .update(staffRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(
      and(eq(staffRecoveryCodes.id, id), isNull(staffRecoveryCodes.usedAt)),
    )
    .returning();
  return row ?? null;
}

export async function createPasswordResetToken(
  data: NewPasswordResetToken,
): Promise<PasswordResetToken> {
  const [row] = await db.insert(passwordResetTokens).values(data).returning();
  return row;
}

export async function findValidPasswordResetToken(
  tokenHash: string,
): Promise<PasswordResetToken | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row || row.usedAt) return null;
  return row;
}

export async function markPasswordResetTokenUsed(
  id: string,
): Promise<PasswordResetToken | null> {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt)),
    )
    .returning();
  return row ?? null;
}

export async function invalidatePasswordResetTokensForUser(
  staffUserId: string,
): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.staffUserId, staffUserId),
        isNull(passwordResetTokens.usedAt),
      ),
    );
}

import { and, eq, gt, sql } from 'drizzle-orm';

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

export async function markRecoveryCodeUsed(
  id: string,
): Promise<StaffRecoveryCode | null> {
  const [row] = await db
    .update(staffRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(eq(staffRecoveryCodes.id, id))
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
    .where(eq(passwordResetTokens.id, id))
    .returning();
  return row ?? null;
}

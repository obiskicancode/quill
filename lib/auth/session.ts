import type { NextResponse } from 'next/server';

import type { StaffUser } from '@/db/types';
import { hashToken, randomToken } from '@/lib/auth/crypto';
import { createAccessToken, readAccessToken } from '@/lib/auth/tokens';
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_ACCESS_TTL_SECONDS,
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_REFRESH_TTL_SECONDS,
  clearAuthCookies,
  setAdminAccessCookie,
  setRefreshCookie,
} from '@/lib/cookies';
import {
  findAnySessionByTokenHash,
  findSessionById,
  findSessionByTokenHash,
  findStaffById,
  createSession as insertSession,
  markSessionStepUp,
  revokeAllSessionsForUser,
  revokeSession,
} from '@/lib/db/repositories/staff.repo';
import { clientIp, cookieValue, userAgent } from '@/lib/http/request';
import type { AdminRole } from '@/types/auth.types';

export interface AdminContext {
  user: StaffUser;
  role: AdminRole;
  sessionId: string;
  stepUpVerifiedAt: Date | null;
}

function toContext(
  user: StaffUser,
  sessionId: string,
  stepUpVerifiedAt: Date | null,
): AdminContext {
  return {
    user,
    role: user.role,
    sessionId,
    stepUpVerifiedAt,
  };
}

export function isMfaPending(context: AdminContext): boolean {
  return context.user.role === 'owner' && !context.stepUpVerifiedAt;
}

export async function issueAdminSession(
  response: NextResponse,
  user: StaffUser,
  request: Request,
  options: { stepUpVerifiedAt?: Date | null } = {},
): Promise<void> {
  const refreshToken = randomToken(32);
  const expiresAt = new Date(Date.now() + ADMIN_REFRESH_TTL_SECONDS * 1000);
  const stepUpVerifiedAt =
    options.stepUpVerifiedAt === undefined
      ? user.mfaEnabled
        ? null
        : new Date()
      : options.stepUpVerifiedAt;

  const session = await insertSession({
    staffUserId: user.id,
    sessionTokenHash: hashToken(refreshToken),
    userAgent: userAgent(request),
    ipAddress: clientIp(request),
    expiresAt,
    stepUpVerifiedAt,
  });

  const accessToken = createAccessToken(
    { sub: user.id, sid: session.id, role: user.role },
    ADMIN_ACCESS_TTL_SECONDS,
  );
  setAdminAccessCookie(response, accessToken);
  setRefreshCookie(response, refreshToken);
}

export async function resolveAdminSession(
  request: Request,
): Promise<AdminContext | null> {
  const access = readAccessToken(
    cookieValue(request, ADMIN_ACCESS_COOKIE_NAME),
  );
  if (access) {
    const [session, user] = await Promise.all([
      findSessionById(access.sid),
      findStaffById(access.sub),
    ]);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !user ||
      !user.isActive ||
      session.staffUserId !== user.id ||
      user.role !== access.role
    ) {
      return null;
    }
    return toContext(user, session.id, session.stepUpVerifiedAt);
  }

  const refreshToken = cookieValue(request, ADMIN_REFRESH_COOKIE_NAME);
  if (!refreshToken) return null;
  const session = await findSessionByTokenHash(hashToken(refreshToken));
  if (!session) return null;
  const user = await findStaffById(session.staffUserId);
  if (!user || !user.isActive) return null;
  return toContext(user, session.id, session.stepUpVerifiedAt);
}

export async function rotateAdminSession(
  request: Request,
  response: NextResponse,
): Promise<AdminContext | null> {
  const refreshToken = cookieValue(request, ADMIN_REFRESH_COOKIE_NAME);
  if (!refreshToken) {
    clearAuthCookies(response);
    return null;
  }

  const tokenHash = hashToken(refreshToken);
  const session = await findAnySessionByTokenHash(tokenHash);
  if (!session) {
    clearAuthCookies(response);
    return null;
  }

  if (session.revokedAt) {
    await revokeAllSessionsForUser(session.staffUserId);
    clearAuthCookies(response);
    return null;
  }

  if (session.expiresAt <= new Date()) {
    clearAuthCookies(response);
    return null;
  }

  const user = await findStaffById(session.staffUserId);
  if (!user || !user.isActive) {
    await revokeSession(session.id);
    clearAuthCookies(response);
    return null;
  }

  await revokeSession(session.id);
  const nextRefreshToken = randomToken(32);
  const nextSession = await insertSession({
    staffUserId: user.id,
    sessionTokenHash: hashToken(nextRefreshToken),
    userAgent: userAgent(request),
    ipAddress: clientIp(request),
    expiresAt: new Date(Date.now() + ADMIN_REFRESH_TTL_SECONDS * 1000),
    stepUpVerifiedAt: session.stepUpVerifiedAt,
  });

  const accessToken = createAccessToken(
    { sub: user.id, sid: nextSession.id, role: user.role },
    ADMIN_ACCESS_TTL_SECONDS,
  );
  setAdminAccessCookie(response, accessToken);
  setRefreshCookie(response, nextRefreshToken);
  return toContext(user, nextSession.id, nextSession.stepUpVerifiedAt);
}

export async function markAdminSessionVerified(
  sessionId: string,
): Promise<void> {
  await markSessionStepUp(sessionId);
}

export async function revokeAdminSession(
  context: AdminContext,
  response: NextResponse,
): Promise<void> {
  await revokeSession(context.sessionId);
  clearAuthCookies(response);
}

export async function revokeAllAdminSessions(
  context: AdminContext,
): Promise<void> {
  await revokeAllSessionsForUser(context.user.id);
}

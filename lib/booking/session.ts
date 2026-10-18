import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '@/config'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

/**
 * Short-lived, httpOnly, signed access cookie bound to one booking reference.
 * "checkout" is set right after the reservation is created (masked contact details).
 * "verified" is set after the guest proves their email (full details).
 */
export type AccessLevel = 'checkout' | 'verified'

export const ACCESS_TTL_SECONDS = 2 * 60 * 60
export const cookieName = (reference: string) => `dea_bk_${reference}`

function secret(): string {
  const s = config.BOOKING.COOKIE_SECRET
  if (s) return s
  if (config.isProd) throw new Error('BOOKING_COOKIE_SECRET must be set in production')
  return 'dev-only-secret-change-me'
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

export function createAccessValue(reference: string, level: AccessLevel, ttl = ACCESS_TTL_SECONDS): string {
  const payload = `${Math.floor(Date.now() / 1000) + ttl}.${level === 'verified' ? 'v' : 'c'}`
  return `${payload}.${sign(`${reference}.${payload}`)}`
}

export function readAccessValue(reference: string, value: string | undefined): AccessLevel | null {
  if (!value) return null
  const [exp, lvl, sig] = value.split('.')
  if (!exp || !lvl || !sig || Number(exp) < Date.now() / 1000) return null
  const expected = Buffer.from(sign(`${reference}.${exp}.${lvl}`))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return lvl === 'v' ? 'verified' : 'checkout'
}

export async function getAccess(reference: string): Promise<AccessLevel | null> {
  const jar = await cookies()
  // A live manage session also proves the guest verified, so every booking endpoint accepts it.
  if (readManageValue(reference, jar.get(manageCookieName(reference))?.value)) return 'verified'
  return readAccessValue(reference, jar.get(cookieName(reference))?.value)
}

// ---------------------------------------------------------------------------------------------
// Manage-booking session: 30 minutes, httpOnly, signed, bound to one reference. It also carries a CSRF token.
// ---------------------------------------------------------------------------------------------
export const MANAGE_TTL_SECONDS = 30 * 60
export const manageCookieName = (reference: string) => `dea_mg_${reference}`

export function createManageValue(reference: string, ttl = MANAGE_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttl
  return `${exp}.${sign(`${reference}.mg.${exp}`)}`
}

export interface ManageSession {
  expiresAt: number
  /** Derived from the cookie, so a cross-site page that cannot read it cannot forge a request. */
  csrf: string
}

export function readManageValue(reference: string, value: string | undefined): ManageSession | null {
  if (!value) return null
  const [exp, sig] = value.split('.')
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return null
  const expected = Buffer.from(sign(`${reference}.mg.${exp}`))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return { expiresAt: Number(exp) * 1000, csrf: sign(`${reference}.csrf.${exp}`).slice(0, 32) }
}

export async function getManageSession(reference: string): Promise<ManageSession | null> {
  const jar = await cookies()
  return readManageValue(reference, jar.get(manageCookieName(reference))?.value)
}

export function setManageCookie(res: NextResponse, reference: string, value: string = createManageValue(reference)): ManageSession {
  res.cookies.set(manageCookieName(reference), value, {
    httpOnly: true,
    // Lax, not Strict: the guest returns from the payment provider by a cross-site redirect and must still be signed in.
    // Changes are protected by the CSRF token instead.
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: MANAGE_TTL_SECONDS,
  })
  return readManageValue(reference, value) as ManageSession
}

export function clearManageCookie(res: NextResponse, reference: string): void {
  res.cookies.set(manageCookieName(reference), '', { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/', maxAge: 0 })
}

export function setAccessCookie(res: NextResponse, reference: string, level: AccessLevel): void {
  res.cookies.set(cookieName(reference), createAccessValue(reference, level), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  })
}

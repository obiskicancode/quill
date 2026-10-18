import { getManageSession } from '../booking/session'
import { isDemoRef } from '../booking/view'
import { rateLimited, store } from '../checkout/mock-db'
import { apiFail } from '@/app/api/envelope'
import type { ManageApiError } from '@/types/manage.types'

const noStore = { 'Cache-Control': 'no-store' }

export const manageError = (status: number, error: ManageApiError) => apiFail(status, error.message, error, { headers: noStore })

/**
 * Every change needs: a live manage session cookie, a matching CSRF token and a rate-limit pass.
 * (In development the DEMO-01 reference skips the cookie and CSRF so every state can be previewed.)
 */
export async function requireManage(req: Request, reference: string, demo: string | null): Promise<{ ok: true } | { ok: false; res: Response }> {
  const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(`manage:${client}`, 40, 60_000)) {
    return { ok: false, res: manageError(429, { code: 'rate_limited', message: 'Too many requests. Please wait a moment.', retryAfterSeconds: 60 }) }
  }
  if (isDemoRef(reference)) {
    const demos = new Set((demo ?? '').split(',').map((t) => t.trim()))
    // Preview switch: the first change after this is refused as if the session had just ended.
    if (demos.has('session-expired') && !store.consumed.has('session-expired')) {
      store.consumed.add('session-expired')
      return { ok: false, res: manageError(401, { code: 'session_expired', message: 'Your session has ended. Please verify again.' }) }
    }
    return { ok: true }
  }
  const session = await getManageSession(reference)
  if (!session) return { ok: false, res: manageError(401, { code: 'session_expired', message: 'Your session has ended. Please verify again.' }) }
  if (req.headers.get('x-csrf-token') !== session.csrf) return { ok: false, res: manageError(403, { code: 'csrf', message: 'This request could not be verified. Reload the page and try again.' }) }
  return { ok: true }
}

/** Replays the stored answer when the same idempotency key arrives again, so a retry can never repeat a change. */
export const replayKey = (scope: string, key: string) => `${scope}:${key}`

/** The session details a manage view needs (CSRF token and expiry). Preview reservations get a fixed fake session. */
export async function manageOpts(reference: string): Promise<{ csrf: string; expiresAt: number } | undefined> {
  if (isDemoRef(reference)) return { csrf: 'demo-csrf', expiresAt: Date.now() + 30 * 60_000 }
  const session = await getManageSession(reference)
  return session ? { csrf: session.csrf, expiresAt: session.expiresAt } : undefined
}

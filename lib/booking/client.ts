import type { BookingApiError, GuestReservation, ResendResponse } from '@/types/booking.types'
import type { StatusResponse } from '@/types/checkout.types'
import type { VerifyRequest } from '@/schemas/booking.schema'

/** Typed fetch helpers for the confirmation page. Every call here is a read or a rate-limited, repeat-safe action. */
export class BookingFailure extends Error {
  constructor(public status: number, public body: BookingApiError | null, public network = false) {
    super(body?.message ?? (network ? 'Network error' : 'Request failed'))
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init })
  } catch {
    throw new BookingFailure(0, null, true)
  }
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok) throw new BookingFailure(res.status, (json as BookingApiError | null) ?? null)
  return json as T
}

const withDemo = (url: string, demo: string | null) => (demo ? `${url}${url.includes('?') ? '&' : '?'}demo=${encodeURIComponent(demo)}` : url)
const enc = encodeURIComponent

export const bookingApi = {
  get: (reference: string, demo: string | null) => call<GuestReservation>(withDemo(`/api/reservations/${enc(reference)}`, demo)),
  status: (reference: string, demo: string | null) => call<StatusResponse>(withDemo(`/api/reservations/${enc(reference)}/status`, demo)),
  verify: (body: VerifyRequest) =>
    call<GuestReservation>('/api/reservations/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  resend: (reference: string, demo: string | null) =>
    call<ResendResponse>(withDemo(`/api/reservations/${enc(reference)}/resend-confirmation`, demo), { method: 'POST' }),
}

export const calendarUrl = (reference: string, demo: string | null) => withDemo(`/api/reservations/${enc(reference)}/calendar`, demo)

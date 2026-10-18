import type { ISODate } from '@/lib/dates'
import { formatNaira } from '@/lib/format'

/** Shared by the server (pricing, API route) and the booking card. Money is integer minor units (kobo). */

export interface StayInput {
  checkIn: ISODate | null
  checkOut: ISODate | null
  adults: number
  children: number
  extraBed: boolean
}

export type StayPatch = Partial<StayInput>

export type ViolationCode =
  | 'checkout-before-checkin'
  | 'checkin-past'
  | 'same-day-cutoff'
  | 'min-nights'
  | 'max-nights'
  | 'booking-window'
  | 'over-capacity'
  | 'extra-bed-required'

export interface Violation {
  code: ViolationCode
  message: string
  /** One tap that fixes the problem. */
  fix?: { label: string; patch: StayPatch }
}

export interface QuoteLine {
  date: ISODate
  rateMinor: number
  note: string | null
}

export interface StayQuote {
  nights: number
  lines: QuoteLine[]
  roomSubtotalMinor: number
  averageNightlyMinor: number
  extraBed: { perNightMinor: number; totalMinor: number } | null
  serviceChargePercent: number
  serviceChargeMinor: number
  taxPercent: number
  taxMinor: number
  taxIncluded: boolean
  totalMinor: number
  /** Last day to cancel free of charge, or null when it does not apply. */
  freeCancellationUntil: ISODate | null
}

export type QuoteResponse =
  | { status: 'available'; remaining: number; quote: StayQuote }
  | { status: 'sold-out'; suggestions: { checkIn: ISODate; checkOut: ISODate; totalMinor: number }[] }
  | { status: 'on-request' }
  | { status: 'invalid'; violations: Violation[] }

export type QuoteDemo = 'loading' | 'error' | 'soldout' | 'low' | 'late'
export const QUOTE_DEMOS: QuoteDemo[] = ['loading', 'error', 'soldout', 'low', 'late']

export const formatMinor = (minor: number): string => formatNaira(minor / 100)

export function stayParams(s: StayInput): URLSearchParams {
  const p = new URLSearchParams()
  if (s.checkIn && s.checkOut) {
    p.set('checkIn', s.checkIn)
    p.set('checkOut', s.checkOut)
  }
  p.set('adults', String(s.adults))
  p.set('children', String(s.children))
  return p
}

/** Link into Checkout with the chosen room, dates, guests and extra bed. */
export function bookingHref(base: string, slug: string, s: StayInput): string {
  const p = stayParams(s)
  p.set('room', slug)
  if (s.extraBed) p.set('extraBed', '1')
  return `${base}?${p.toString()}`
}

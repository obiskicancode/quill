import type { ISODate } from './dates'
import type { SearchState } from './types'

export const MAX_ADULTS = 10
export const MAX_CHILDREN = 6

export const initialSearch: SearchState = { checkIn: null, checkOut: null, adults: 2, children: 0 }

/** Returns a plain-language error, or null when the search can run. */
export function validateSearch(s: SearchState, today: ISODate): string | null {
  if (!s.checkIn || !s.checkOut) return 'Choose your check-in and check-out dates.'
  if (s.checkIn < today) return "Check-in can't be in the past."
  if (s.checkOut <= s.checkIn) return 'Check-out must be after check-in.'
  if (s.adults < 1) return 'At least one adult is needed.'
  return null
}

export function buildSearchHref(base: string, s: SearchState): string {
  const params = new URLSearchParams({
    checkIn: s.checkIn ?? '',
    checkOut: s.checkOut ?? '',
    adults: String(s.adults),
    children: String(s.children),
  })
  return `${base}?${params.toString()}`
}

export function guestSummary(s: Pick<SearchState, 'adults' | 'children'>): string {
  const adults = `${s.adults} ${s.adults === 1 ? 'adult' : 'adults'}`
  if (s.children === 0) return adults
  return `${adults}, ${s.children} ${s.children === 1 ? 'child' : 'children'}`
}

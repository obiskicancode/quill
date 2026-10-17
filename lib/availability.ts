import { addDays, nightsBetween, todayISO, type ISODate } from './dates'
import { isWeekendNight, maxGuests, nightlyPrice, type RoomType } from './rooms'

/**
 * MOCK availability. Replace fetchAvailability with a call to your real endpoint and keep the return shape.
 * Results are deterministic per room and date, so the same dates always give the same answer.
 */

export type DemoMode = 'loading' | 'error' | 'soldout' | 'low'

export interface StayParams {
  checkIn: ISODate
  checkOut: ISODate
  adults: number
  children: number
}

export interface DateSuggestion {
  checkIn: ISODate
  checkOut: ISODate
  totalNgn: number | null
}

export type RoomAvailability =
  | { status: 'available'; remaining: number; nights: number; totalNgn: number; averageNgn: number; weekendNights: number }
  | { status: 'sold-out'; suggestions: DateSuggestion[] }
  | { status: 'min-stay'; minNights: number; suggestedCheckOut: ISODate }
  | { status: 'over-capacity'; maxAdults: number; maxChildren: number }
  | { status: 'on-request' }

export type AvailabilityMap = Record<string, RoomAvailability>

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

/** Rooms left for a given arrival date: 0 means sold out. */
function remainingFor(room: RoomType, checkIn: ISODate, demo: DemoMode | null, requested: boolean): number {
  if (requested && demo === 'soldout') return 0
  if (requested && demo === 'low') return 1
  return hash(room.id + checkIn) % 6
}

function totalFor(room: RoomType, checkIn: ISODate, nights: number): number {
  let total = 0
  for (let i = 0; i < nights; i++) total += nightlyPrice(room, addDays(checkIn, i))
  return total
}

export async function fetchAvailability(stay: StayParams, rooms: RoomType[], demo: DemoMode | null): Promise<AvailabilityMap> {
  await sleep(demo === 'loading' ? 20_000 : 600)
  if (demo === 'error') throw new Error('Availability service unavailable')

  const nights = nightsBetween(stay.checkIn, stay.checkOut)
  const result: AvailabilityMap = {}

  for (const room of rooms) {
    if (stay.adults > room.maxAdults || stay.children > room.maxChildren || stay.adults + stay.children > maxGuests(room)) {
      result[room.id] = { status: 'over-capacity', maxAdults: room.maxAdults, maxChildren: room.maxChildren }
      continue
    }
    if (!room.showPrice) {
      result[room.id] = { status: 'on-request' }
      continue
    }
    if (nights < room.minStayNights) {
      result[room.id] = { status: 'min-stay', minNights: room.minStayNights, suggestedCheckOut: addDays(stay.checkIn, room.minStayNights) }
      continue
    }
    const remaining = remainingFor(room, stay.checkIn, demo, true)
    if (remaining === 0) {
      const suggestions: DateSuggestion[] = []
      for (const offset of [-2, -1, 1, 2, 3]) {
        const start = addDays(stay.checkIn, offset)
        if (start < todayISO()) continue
        if (remainingFor(room, start, demo, false) > 0) {
          suggestions.push({ checkIn: start, checkOut: addDays(start, nights), totalNgn: totalFor(room, start, nights) })
        }
        if (suggestions.length === 3) break
      }
      result[room.id] = { status: 'sold-out', suggestions }
      continue
    }
    const totalNgn = totalFor(room, stay.checkIn, nights)
    const weekendNights = Array.from({ length: nights }, (_, i) => addDays(stay.checkIn, i)).filter(isWeekendNight).length
    result[room.id] = {
      status: 'available',
      remaining,
      nights,
      totalNgn,
      averageNgn: Math.round(totalNgn / nights),
      weekendNights: room.weekendPriceNgn !== null ? weekendNights : 0,
    }
  }
  return result
}

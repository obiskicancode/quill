import { type NextRequest } from 'next/server'
import { fetchAvailability, type DemoMode } from '@/lib/availability'
import { roomTypes } from '@/lib/rooms'
import { apiFail, apiOk } from '@/app/api/envelope'

const DEMOS: DemoMode[] = ['loading', 'error', 'soldout', 'low']
const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Live availability for a set of rooms on the chosen dates. The card list only ever displays what this returns. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const checkIn = sp.get('checkIn')
  const checkOut = sp.get('checkOut')
  if (!checkIn || !checkOut || !ISO.test(checkIn) || !ISO.test(checkOut)) {
    return apiFail(400, 'Choose your dates.', { code: 'dates_required' })
  }

  const adults = Number(sp.get('adults') ?? 2)
  const children = Number(sp.get('children') ?? 0)
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) {
    return apiFail(400, 'Check the number of guests.', { code: 'invalid_guests' })
  }

  // The client sends ids; the server decides which rooms exist and what they cost.
  const wanted = (sp.get('rooms') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const rooms = wanted.length > 0 ? roomTypes.filter((r) => wanted.includes(r.id)) : roomTypes
  if (rooms.length === 0) return apiFail(400, 'No rooms matched those dates.', { code: 'rooms_required' })

  const rawDemo = sp.get('demo')
  const demo = DEMOS.includes(rawDemo as DemoMode) ? (rawDemo as DemoMode) : null

  try {
    const map = await fetchAvailability({ checkIn, checkOut, adults, children }, rooms, demo)
    return apiOk(map, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return apiFail(503, 'Availability is unavailable.', { code: 'unavailable' })
  }
}

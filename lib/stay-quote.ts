import { addDays, formatShort, nightsBetween, type ISODate } from './dates'
import { fetchAvailability } from './availability'
import { baseGuests, hotelSettings, rateRules, type HotelSettings, type RoomDetail } from './room-detail'
import { isWeekendNight } from './rooms'
import { formatMinor, type QuoteDemo, type QuoteLine, type QuoteResponse, type StayInput, type StayQuote, type Violation } from '@/types/stay.types'

/**
 * MOCK SERVER PRICING. All money maths happens here (server only); the client just displays the result.
 * Replace the body of getQuoteResponse with a call to your real pricing service and keep the return shape.
 */

export interface Clock {
  today: ISODate
  /** Minutes since midnight in the hotel's time zone. */
  minutes: number
}

export function hotelClock(now: Date = new Date(), demo: QuoteDemo | null = null): Clock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: hotelSettings.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const minutes = demo === 'late' ? 20 * 60 : (Number(get('hour')) % 24) * 60 + Number(get('minute'))
  return { today: `${get('year')}-${get('month')}-${get('day')}`, minutes }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const inRange = (md: string, start: string, end: string) => (start <= end ? md >= start && md <= end : md >= start || md <= end)
const roundToNaira = (minor: number) => Math.round(minor / 100) * 100

function nightRate(room: RoomDetail, date: ISODate): QuoteLine {
  const weekend = isWeekendNight(date) && room.weekendPriceMinor !== null
  let rate = weekend ? (room.weekendPriceMinor as number) : room.basePriceMinor
  const notes: string[] = []
  if (weekend) notes.push('Weekend rate')
  const rule = rateRules.find((r) => inRange(date.slice(5), r.start, r.end))
  if (rule) {
    rate = roundToNaira(rate * (1 + rule.upliftPercent / 100))
    notes.push(rule.label)
  }
  return { date, rateMinor: rate, note: notes.length ? notes.join(', ') : null }
}

export const needsExtraBed = (room: RoomDetail, adults: number, children: number) =>
  room.extraBed.available && adults + children > baseGuests(room)

export function priceStay(
  room: RoomDetail, hotel: HotelSettings, checkIn: ISODate, checkOut: ISODate, extraBedSelected: boolean, today: ISODate,
): StayQuote {
  const nights = nightsBetween(checkIn, checkOut)
  const lines = Array.from({ length: nights }, (_, i) => nightRate(room, addDays(checkIn, i)))
  const roomSubtotalMinor = lines.reduce((sum, l) => sum + l.rateMinor, 0)
  const perNight = room.extraBedPriceMinor ?? 0
  const extraBed = extraBedSelected && room.extraBed.available ? { perNightMinor: perNight, totalMinor: perNight * nights } : null

  const subtotal = roomSubtotalMinor + (extraBed?.totalMinor ?? 0)
  const serviceChargeMinor = Math.round((subtotal * hotel.serviceChargePercent) / 100)
  const taxable = subtotal + serviceChargeMinor
  const rate = hotel.taxPercent / 100
  const taxIncluded = room.taxesIncluded
  const taxMinor = taxIncluded ? Math.round(taxable - taxable / (1 + rate)) : Math.round(taxable * rate)

  let freeCancellationUntil: ISODate | null = null
  if (hotel.freeCancellationHours !== null) {
    const deadline = addDays(checkIn, -Math.ceil(hotel.freeCancellationHours / 24))
    if (deadline >= today) freeCancellationUntil = deadline
  }

  return {
    nights, lines, roomSubtotalMinor,
    averageNightlyMinor: Math.round(roomSubtotalMinor / nights),
    extraBed, serviceChargePercent: hotel.serviceChargePercent, serviceChargeMinor,
    taxPercent: hotel.taxPercent, taxMinor, taxIncluded,
    totalMinor: taxIncluded ? taxable : taxable + taxMinor,
    freeCancellationUntil,
  }
}

export function validateStay(
  room: RoomDetail, hotel: HotelSettings, s: StayInput & { checkIn: ISODate; checkOut: ISODate }, clock: Clock,
): Violation[] {
  const out: Violation[] = []
  const minNights = Math.max(hotel.minNights, room.minStayNights)
  const nights = nightsBetween(s.checkIn, s.checkOut)
  const guests = s.adults + s.children
  const setCheckOut = (n: number) => ({ checkOut: addDays(s.checkIn, n) })

  if (s.checkOut <= s.checkIn) {
    out.push({
      code: 'checkout-before-checkin',
      message: 'Check-out must be after check-in.',
      fix: { label: `Set check-out to ${formatShort(addDays(s.checkIn, minNights))}`, patch: setCheckOut(minNights) },
    })
  } else {
    if (s.checkIn < clock.today) {
      out.push({ code: 'checkin-past', message: "Check-in can't be in the past.", fix: { label: 'Clear dates', patch: { checkIn: null, checkOut: null } } })
    } else if (s.checkIn === clock.today && clock.minutes > toMinutes(hotel.sameDayCutoff)) {
      out.push({
        code: 'same-day-cutoff',
        message: `Same-day bookings close at ${hotel.sameDayCutoff}. Choose tomorrow or later.`,
        fix: { label: 'Start tomorrow', patch: { checkIn: addDays(s.checkIn, 1), checkOut: addDays(s.checkOut, 1) } },
      })
    }
    if (nights < minNights) {
      out.push({
        code: 'min-nights',
        message: `This room needs a stay of at least ${minNights} ${minNights === 1 ? 'night' : 'nights'}.`,
        fix: { label: `Set check-out to ${formatShort(addDays(s.checkIn, minNights))}`, patch: setCheckOut(minNights) },
      })
    }
    if (nights > hotel.maxNights) {
      out.push({
        code: 'max-nights',
        message: `The longest stay we take online is ${hotel.maxNights} nights. For longer stays, message us.`,
        fix: { label: `Set check-out to ${formatShort(addDays(s.checkIn, hotel.maxNights))}`, patch: setCheckOut(hotel.maxNights) },
      })
    }
    if (s.checkIn > addDays(clock.today, hotel.bookingWindowDays)) {
      out.push({
        code: 'booking-window',
        message: `We take bookings up to ${hotel.bookingWindowDays} days ahead. Choose an earlier date.`,
        fix: { label: 'Clear dates', patch: { checkIn: null, checkOut: null } },
      })
    }
  }

  if (s.adults > room.maxAdults || s.children > room.maxChildren) {
    out.push({
      code: 'over-capacity',
      message: `This room sleeps up to ${room.maxAdults} adults and ${room.maxChildren} children.`,
      fix: { label: 'Use the maximum allowed', patch: { adults: Math.min(s.adults, room.maxAdults), children: Math.min(s.children, room.maxChildren) } },
    })
  } else if (needsExtraBed(room, s.adults, s.children) && !s.extraBed) {
    out.push({
      code: 'extra-bed-required',
      message: `${guests} guests need the extra bed (${room.extraBedPriceMinor ? `${formatMinor(room.extraBedPriceMinor)} / night` : 'free'}). Add it, or reduce the number of guests.`,
      fix: { label: 'Add the extra bed', patch: { extraBed: true } },
    })
  }
  return out
}

export async function getQuoteResponse(
  room: RoomDetail, input: StayInput & { checkIn: ISODate; checkOut: ISODate }, demo: QuoteDemo | null, clock: Clock,
): Promise<QuoteResponse> {
  if (!room.showPrice) return { status: 'on-request' }

  const violations = validateStay(room, hotelSettings, input, clock)
  if (violations.length > 0) return { status: 'invalid', violations }

  const extraBed = needsExtraBed(room, input.adults, input.children) && input.extraBed
  const stay = { checkIn: input.checkIn, checkOut: input.checkOut, adults: input.adults, children: input.children }
  const availabilityDemo = demo === 'late' ? null : demo
  const result = (await fetchAvailability(stay, [room], availabilityDemo))[room.id]

  if (result.status === 'sold-out') {
    return {
      status: 'sold-out',
      suggestions: result.suggestions.map((s) => ({
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        totalMinor: priceStay(room, hotelSettings, s.checkIn, s.checkOut, extraBed, clock.today).totalMinor,
      })),
    }
  }
  if (result.status === 'on-request') return { status: 'on-request' }
  if (result.status !== 'available') {
    return { status: 'invalid', violations: [{ code: 'over-capacity', message: 'This room cannot take your group for these dates.' }] }
  }
  return { status: 'available', remaining: result.remaining, quote: priceStay(room, hotelSettings, input.checkIn, input.checkOut, extraBed, clock.today) }
}

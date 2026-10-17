import { fromISO, nightsBetween, toISO, type ISODate } from '../dates'
import { getRoomDetail } from '../room-detail'
import { getQuoteResponse, hotelClock, needsExtraBed, type Clock } from '../stay-quote'
import { getCheckoutSettings, parseDemos } from './settings'
import { unitLabels } from './format'
import type {
  BreakdownExtraLine, CheckoutQuoteResponse, CheckoutSettings, ExtraItem, PaymentPlan, PolicySummary, QuoteRequest,
} from './types'

/**
 * MOCK SERVER QUOTE. The only place prices, discount, levy, tax, deposit and availability are decided.
 * It builds on the room page's pricing (stay-quote.ts) and adds extras, discount, levy and the payment plan.
 * Replace the body with your real pricing service and keep the return shape.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const roundToNaira = (minor: number) => Math.round(minor / 100) * 100

function unitMultiplier(unit: ExtraItem['unit'], nights: number, guests: number): number {
  switch (unit) {
    case 'per_stay': return 1
    case 'per_night': return nights
    case 'per_guest': return guests
    case 'per_guest_per_night': return guests * nights
  }
}

function cancellationPolicy(settings: CheckoutSettings, checkIn: ISODate, clock: Clock): PolicySummary {
  if (settings.nonRefundable) return { nonRefundable: true, freeCancellationUntil: null, note: 'Non-refundable' }
  if (settings.freeCancellationHours !== null) {
    const [h, m] = settings.checkInTime24.split(':').map(Number)
    const deadline = fromISO(checkIn)
    deadline.setHours(h, m, 0, 0)
    deadline.setTime(deadline.getTime() - settings.freeCancellationHours * 3_600_000)
    const date = toISO(deadline)
    const time = `${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}`
    const passed = date < clock.today || (date === clock.today && h * 60 + m - settings.freeCancellationHours * 60 < clock.minutes)
    if (!passed) return { nonRefundable: false, freeCancellationUntil: { date, time }, note: 'Free cancellation' }
  }
  return { nonRefundable: false, freeCancellationUntil: null, note: 'Cancellation charges apply. See the Cancellation Policy.' }
}

export async function buildCheckoutQuote(req: QuoteRequest): Promise<CheckoutQuoteResponse> {
  const demos = parseDemos(req.demo)
  if (demos.has('slowquote')) await sleep(2500)
  if (demos.has('quoteerror')) throw new Error('Quote service unavailable')

  const serverTime = new Date().toISOString()
  const room = getRoomDetail(req.room)
  if (!room || !room.showPrice) return { status: 'invalid', reason: 'params', message: 'That room cannot be booked online.' }

  const clock = hotelClock()
  const stay = { checkIn: req.checkIn, checkOut: req.checkOut, adults: req.adults, children: req.children, extraBed: req.extraBed }
  const base = await getQuoteResponse(room, stay, demos.has('unavailable') ? 'soldout' : demos.has('avail') ? 'low' : null, clock)

  if (base.status === 'invalid') return { status: 'invalid', reason: 'rules', message: base.violations.map((v) => v.message).join(' ') }
  if (base.status === 'on-request') return { status: 'invalid', reason: 'params', message: 'That room cannot be booked online.' }
  if (base.status === 'sold-out') return { status: 'unavailable', suggestions: base.suggestions, serverTime }

  const settings = getCheckoutSettings(demos)
  const q = base.quote
  const nights = nightsBetween(req.checkIn, req.checkOut)
  const guests = req.adults + req.children

  const extraLines: BreakdownExtraLine[] = []
  for (const sel of req.extras) {
    const item = settings.extras.find((e) => e.id === sel.id)
    const quantity = Math.min(sel.quantity, item?.maxQuantity ?? 0)
    if (!item || quantity <= 0) continue
    extraLines.push({
      id: item.id,
      name: item.name,
      quantity,
      unitLabel: unitLabels[item.unit],
      totalMinor: item.priceMinor * quantity * unitMultiplier(item.unit, nights, guests),
    })
  }

  const extrasTotal = extraLines.reduce((s, l) => s + l.totalMinor, 0)
  const beforeDiscount = q.roomSubtotalMinor + (q.extraBed?.totalMinor ?? 0) + extrasTotal
  const discountMinor = settings.discount ? Math.round((beforeDiscount * settings.discount.percent) / 100) : 0
  const subtotal = beforeDiscount - discountMinor
  const serviceChargeMinor = Math.round((subtotal * q.serviceChargePercent) / 100)
  const levyMinor = settings.otherLevy ? Math.round((subtotal * settings.otherLevy.percent) / 100) : 0
  const taxable = subtotal + serviceChargeMinor + levyMinor
  const rate = q.taxPercent / 100
  const taxMinor = q.taxIncluded ? Math.round(taxable - taxable / (1 + rate)) : Math.round(taxable * rate)
  const totalMinor = q.taxIncluded ? taxable : taxable + taxMinor

  const dueNowMinor =
    settings.paymentMode === 'full' ? totalMinor
    : settings.paymentMode === 'deposit' ? roundToNaira((totalMinor * settings.depositPercent) / 100)
    : 0
  const payment: PaymentPlan = {
    mode: settings.paymentMode,
    totalMinor,
    dueNowMinor,
    balanceAtHotelMinor: totalMinor - dueNowMinor,
    acceptedMethods: settings.acceptedMethods,
    provider: settings.provider,
  }

  const seen = demos.has('changed') && req.seenTotalMinor == null ? totalMinor - 500_000 : req.seenTotalMinor ?? null

  return {
    status: 'ok',
    breakdown: {
      nights: q.nights,
      lines: q.lines,
      roomSubtotalMinor: q.roomSubtotalMinor,
      averageNightlyMinor: q.averageNightlyMinor,
      extraBed: q.extraBed,
      serviceChargePercent: q.serviceChargePercent,
      serviceChargeMinor,
      taxPercent: q.taxPercent,
      taxMinor,
      taxIncluded: q.taxIncluded,
      totalMinor,
      extras: extraLines,
      discount: settings.discount && discountMinor > 0 ? { label: settings.discount.label, amountMinor: discountMinor } : null,
      otherLevy: settings.otherLevy ? { label: settings.otherLevy.label, percent: settings.otherLevy.percent, amountMinor: levyMinor } : null,
    },
    policy: cancellationPolicy(settings, req.checkIn, clock),
    payment,
    confirmationMode: settings.confirmationMode,
    holdSeconds: settings.holdSeconds,
    extrasCatalog: settings.extras,
    extraBed: {
      needed: needsExtraBed(room, req.adults, req.children),
      available: room.extraBed.available,
      priceMinor: room.extraBedPriceMinor,
      selected: Boolean(q.extraBed),
    },
    priceChange: seen !== null && seen !== totalMinor ? { previousTotalMinor: seen, currentTotalMinor: totalMinor } : null,
    serverTime,
  }
}


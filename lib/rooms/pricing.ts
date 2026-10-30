import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatMinor } from '@/lib/format';
import type { Clock, ISODate } from '@/types/dates.types';
import type { HotelPricingSettings, RoomDetail } from '@/types/rooms.types';
import type {
  QuoteLine,
  QuoteResponse,
  StayInput,
  StayQuote,
  Violation,
} from '@/types/stay.types';

import { addDays, formatShort, hotelClock, nightsBetween } from '../dates';
import { fetchAvailability } from './availability';
import { isWeekendNight } from './catalog';
import { baseGuests, getPricingSettings } from './detail';

export { hotelClock };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const inRange = (md: string, start: string, end: string) =>
  start <= end ? md >= start && md <= end : md >= start || md <= end;
const roundToNaira = (minor: number) => Math.round(minor / 100) * 100;

function nightRate(
  room: RoomDetail,
  date: ISODate,
  hotel: HotelPricingSettings,
): QuoteLine {
  const weekend = isWeekendNight(date) && room.weekendPriceMinor !== null;
  let rate = weekend ? (room.weekendPriceMinor as number) : room.basePriceMinor;
  const notes: string[] = [];
  if (weekend) notes.push('Weekend rate');
  const rule = (hotel.rateRules ?? []).find((r) =>
    inRange(date.slice(5), r.start, r.end),
  );
  if (rule) {
    rate = roundToNaira(rate * (1 + rule.upliftPercent / 100));
    notes.push(rule.label);
  }
  return {
    date,
    rateMinor: rate,
    note: notes.length ? notes.join(', ') : null,
  };
}

export const needsExtraBed = (
  room: RoomDetail,
  adults: number,
  children: number,
) => room.extraBed.available && adults + children > baseGuests(room);

export function priceStay(
  room: RoomDetail,
  hotel: HotelPricingSettings,
  checkIn: ISODate,
  checkOut: ISODate,
  extraBedSelected: boolean,
  today: ISODate,
): StayQuote {
  const nights = nightsBetween(checkIn, checkOut);
  const lines = Array.from({ length: nights }, (_, i) =>
    nightRate(room, addDays(checkIn, i), hotel),
  );
  const roomSubtotalMinor = lines.reduce((sum, l) => sum + l.rateMinor, 0);
  const perNight = room.extraBedPriceMinor ?? 0;
  const extraBed =
    extraBedSelected && room.extraBed.available
      ? { perNightMinor: perNight, totalMinor: perNight * nights }
      : null;

  const subtotal = roomSubtotalMinor + (extraBed?.totalMinor ?? 0);
  const serviceChargeMinor = Math.round(
    (subtotal * hotel.serviceChargePercent) / 100,
  );
  const taxable = subtotal + serviceChargeMinor;
  const rate = hotel.taxPercent / 100;
  const taxIncluded = room.taxesIncluded;
  const taxMinor = taxIncluded
    ? Math.round(taxable - taxable / (1 + rate))
    : Math.round(taxable * rate);

  let freeCancellationUntil: ISODate | null = null;
  if (hotel.freeCancellationHours !== null) {
    const deadline = addDays(
      checkIn,
      -Math.ceil(hotel.freeCancellationHours / 24),
    );
    if (deadline >= today) freeCancellationUntil = deadline;
  }

  return {
    nights,
    lines,
    roomSubtotalMinor,
    averageNightlyMinor: Math.round(roomSubtotalMinor / nights),
    extraBed,
    serviceChargePercent: hotel.serviceChargePercent,
    serviceChargeMinor,
    taxPercent: hotel.taxPercent,
    taxMinor,
    taxIncluded,
    totalMinor: taxIncluded ? taxable : taxable + taxMinor,
    freeCancellationUntil,
  };
}

export function validateStay(
  room: RoomDetail,
  hotel: HotelPricingSettings,
  s: StayInput & { checkIn: ISODate; checkOut: ISODate },
  clock: Clock,
): Violation[] {
  const out: Violation[] = [];
  const minNights = Math.max(hotel.minNights, room.minStayNights);
  const nights = nightsBetween(s.checkIn, s.checkOut);
  const guests = s.adults + s.children;
  const setCheckOut = (n: number) => ({ checkOut: addDays(s.checkIn, n) });

  if (s.checkOut <= s.checkIn) {
    out.push({
      code: ERROR_CODES.CHECKOUT_BEFORE_CHECKIN,
      message: ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN,
      fix: {
        label: `Set check-out to ${formatShort(addDays(s.checkIn, minNights))}`,
        patch: setCheckOut(minNights),
      },
    });
  } else {
    if (s.checkIn < clock.today) {
      out.push({
        code: ERROR_CODES.CHECKIN_PAST,
        message: ERROR_MESSAGES.CHECKIN_IN_PAST,
        fix: { label: 'Clear dates', patch: { checkIn: null, checkOut: null } },
      });
    } else if (
      s.checkIn === clock.today &&
      clock.minutes > toMinutes(hotel.sameDayCutoff)
    ) {
      out.push({
        code: ERROR_CODES.SAME_DAY_CUTOFF,
        message: ERROR_MESSAGES.SAME_DAY_CUTOFF(hotel.sameDayCutoff),
        fix: {
          label: 'Start tomorrow',
          patch: {
            checkIn: addDays(s.checkIn, 1),
            checkOut: addDays(s.checkOut, 1),
          },
        },
      });
    }
    if (nights < minNights) {
      out.push({
        code: ERROR_CODES.MIN_NIGHTS,
        message: ERROR_MESSAGES.MIN_NIGHTS(minNights),
        fix: {
          label: `Set check-out to ${formatShort(addDays(s.checkIn, minNights))}`,
          patch: setCheckOut(minNights),
        },
      });
    }
    if (nights > hotel.maxNights) {
      out.push({
        code: ERROR_CODES.MAX_NIGHTS,
        message: ERROR_MESSAGES.MAX_NIGHTS(hotel.maxNights),
        fix: {
          label: `Set check-out to ${formatShort(addDays(s.checkIn, hotel.maxNights))}`,
          patch: setCheckOut(hotel.maxNights),
        },
      });
    }
    if (s.checkIn > addDays(clock.today, hotel.bookingWindowDays)) {
      out.push({
        code: ERROR_CODES.BOOKING_WINDOW,
        message: ERROR_MESSAGES.BOOKING_WINDOW(hotel.bookingWindowDays),
        fix: { label: 'Clear dates', patch: { checkIn: null, checkOut: null } },
      });
    }
  }

  if (s.adults > room.maxAdults || s.children > room.maxChildren) {
    out.push({
      code: ERROR_CODES.OVER_CAPACITY,
      message: ERROR_MESSAGES.ROOM_CAPACITY(room.maxAdults, room.maxChildren),
      fix: {
        label: 'Use the maximum allowed',
        patch: {
          adults: Math.min(s.adults, room.maxAdults),
          children: Math.min(s.children, room.maxChildren),
        },
      },
    });
  } else if (needsExtraBed(room, s.adults, s.children) && !s.extraBed) {
    out.push({
      code: ERROR_CODES.EXTRA_BED_REQUIRED,
      message: ERROR_MESSAGES.EXTRA_BED_REQUIRED(
        guests,
        room.extraBedPriceMinor
          ? `${formatMinor(room.extraBedPriceMinor)} / night`
          : 'free',
      ),
      fix: { label: 'Add the extra bed', patch: { extraBed: true } },
    });
  }
  return out;
}

export async function getQuoteResponse(
  room: RoomDetail,
  input: StayInput & { checkIn: ISODate; checkOut: ISODate },
  clock: Clock,
  excludeReservationId?: string,
): Promise<QuoteResponse> {
  if (!room.showPrice) return { status: 'on-request' };

  const hotelSettings = await getPricingSettings();
  const violations = validateStay(room, hotelSettings, input, clock);
  if (violations.length > 0) return { status: 'invalid', violations };

  const extraBed =
    needsExtraBed(room, input.adults, input.children) && input.extraBed;
  const stay = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    children: input.children,
  };
  const result = (await fetchAvailability(stay, [room], excludeReservationId))[
    room.id
  ];

  if (result.status === 'sold-out') {
    return {
      status: 'sold-out',
      suggestions: result.suggestions.map((s) => ({
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        totalMinor: priceStay(
          room,
          hotelSettings,
          s.checkIn,
          s.checkOut,
          extraBed,
          clock.today,
        ).totalMinor,
      })),
    };
  }
  if (result.status === 'on-request') return { status: 'on-request' };
  if (result.status !== 'available') {
    return {
      status: 'invalid',
      violations: [
        {
          code: ERROR_CODES.OVER_CAPACITY,
          message: ERROR_MESSAGES.GROUP_UNAVAILABLE,
        },
      ],
    };
  }
  return {
    status: 'available',
    remaining: result.remaining,
    quote: priceStay(
      room,
      hotelSettings,
      input.checkIn,
      input.checkOut,
      extraBed,
      clock.today,
    ),
  };
}

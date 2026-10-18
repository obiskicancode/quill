import type { CheckoutSettings } from '@/types/checkout.types'
import type { CheckoutQuoteResponse } from '@/types/checkout.types'
import { hotelSettings, type RoomDetail } from '../room-detail'
import { site } from '../site'
import type { ReservationSnapshot } from '@/types/booking.types'

const providerNames = { paystack: 'Paystack', flutterwave: 'Flutterwave', stripe: 'Stripe' } as const

/**
 * Builds the policy and hotel snapshot stored on a reservation at creation time (MOCK values from site config).
 * Later changes to hotel settings never alter what this guest agreed to.
 */
export function buildSnapshot(
  room: RoomDetail,
  quote: Extract<CheckoutQuoteResponse, { status: 'ok' }>,
  settings: CheckoutSettings,
): ReservationSnapshot {
  const cover = room.gallery[0]
  return {
    room: { slug: room.slug, name: room.name, bedConfig: room.bedConfig, image: cover ? { src: cover.src, alt: cover.alt } : null },
    breakdown: quote.breakdown,
    policy: {
      cancellation: quote.policy,
      checkInRules: `Check-in from ${hotelSettings.checkInTime}. Early check-in depends on availability.`,
      checkOutRules: `Check-out by ${hotelSettings.checkOutTime}. Late check-out can be arranged on request.`,
      houseRules: [hotelSettings.smokingPolicy, hotelSettings.petsPolicy, hotelSettings.childrenPolicy, '[Quiet hours, for example 10:00 pm to 6:00 am.]'],
      idRequired: true,
      idText: hotelSettings.idPolicy,
      afterDeadline: { kind: 'first_night' }, // [sample] what the hotel keeps after the free window
      freeCancellationHours: settings.freeCancellationHours,
    },
    hotel: {
      name: site.name,
      addressLines: site.address.lines,
      mapQuery: site.address.mapQuery,
      phoneDisplay: site.contact.phoneDisplay,
      phoneTel: site.contact.phoneTel,
      whatsappNumber: site.contact.whatsappNumber,
      reception: site.reception,
      landmarks: site.landmarks,
      howToFindUs: '[A short note on how to find the entrance, for example: look for the green gate next to the pharmacy.]',
    },
    times: { checkIn: hotelSettings.checkInTime, checkOut: hotelSettings.checkOutTime, checkIn24: settings.checkInTime24, checkOut24: '12:00', timeZone: hotelSettings.timeZone },
    providerName: providerNames[settings.provider],
    approvalResponse: 'within 2 hours', // [sample]
    addExtras: { supported: false, catalog: settings.extras }, // set supported: true when guests may add extras after booking
  }
}

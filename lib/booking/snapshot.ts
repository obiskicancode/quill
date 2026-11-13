/**
 * Builds the immutable policy, hotel and price snapshot stored on a
 * reservation, so later settings changes cannot rewrite an existing booking.
 */
import type { ReservationSnapshot } from '@/types/booking.types';
import type {
  CheckoutQuoteResponse,
  CheckoutSettings,
} from '@/types/checkout.types';
import type { RoomDetail } from '@/types/rooms.types';

import {
  getHotelSettings,
  getLandmarks,
  getPolicySettings,
} from '../content/data';
import { formatGuestTime } from '../format';
import { paymentProviderLabel } from '../payments';
import { getPricingSettings } from '../rooms/detail';

/**
 * Captures the room, quote, hotel, policy and payment-provider details that the
 * confirmation, manage and receipt views need after checkout.
 */
export async function buildSnapshot(
  room: RoomDetail,
  quote: Extract<CheckoutQuoteResponse, { status: 'ok' }>,
  settings: CheckoutSettings,
): Promise<ReservationSnapshot> {
  const cover = room.gallery[0];
  const [hotel, pricing, policies, landmarks] = await Promise.all([
    getHotelSettings(),
    getPricingSettings(),
    getPolicySettings(),
    getLandmarks(),
  ]);
  const addressLines = [
    hotel.address.line1,
    [hotel.address.area, hotel.address.city, hotel.address.state]
      .filter(Boolean)
      .join(', '),
    hotel.address.country,
  ].filter(Boolean);
  const mapQuery =
    hotel.latitude !== null && hotel.longitude !== null
      ? `${hotel.latitude},${hotel.longitude}`
      : addressLines.join(', ');
  return {
    room: {
      slug: room.slug,
      name: room.name,
      bedConfig: room.bedConfig,
      image: cover ? { src: cover.src, alt: cover.alt } : null,
    },
    breakdown: quote.breakdown,
    policy: {
      cancellation: quote.policy,
      checkInRules: `Check-in from ${formatGuestTime(pricing.checkInTime)}. Early check-in depends on availability.`,
      checkOutRules: `Check-out by ${formatGuestTime(pricing.checkOutTime)}. Late check-out can be arranged on request.`,
      houseRules: [
        policies.houseRules.childrenPolicy,
        policies.houseRules.petsAllowed
          ? policies.houseRules.petsNote
          : 'No pets.',
        policies.houseRules.smokingPolicy === 'not_allowed'
          ? policies.houseRules.smokingNote
          : 'Smoking is allowed only in designated areas.',
        ...(policies.houseRules.quietHours
          ? [`Quiet hours: ${policies.houseRules.quietHours}.`]
          : []),
      ].filter(Boolean),
      idRequired: true,
      idText:
        'A valid government-issued photo ID is required for every adult at check-in.',
      afterDeadline: { kind: 'first_night' },
      freeCancellationHours: settings.freeCancellationHours,
    },
    hotel: {
      name: hotel.displayName,
      addressLines,
      mapQuery,
      phoneDisplay: hotel.publicPhones[0]?.display ?? '',
      phoneTel: hotel.publicPhones[0]?.tel ?? '',
      whatsappNumber: hotel.whatsappNumber,
      reception: hotel.receptionHours ?? '',
      landmarks,
      howToFindUs: hotel.directionsText ?? '',
    },
    times: {
      checkIn: pricing.checkInTime,
      checkOut: pricing.checkOutTime,
      checkIn24: settings.checkInTime24,
      checkOut24: pricing.checkOutTime,
      timeZone: pricing.timeZone,
    },
    providerName: paymentProviderLabel(settings.provider),
    approvalResponse: `within ${hotel.enquiryResponseHours} hours`,
    addExtras: { supported: false, catalog: settings.extras },
  };
}

import { hotelSettings } from "../room-detail";
import type { CheckoutSettings, ExtraItem, PaymentProvider } from "@/types/checkout.types";

/**
 * MOCK hotel checkout settings. In production these come from the database.
 * Everything in [brackets] and every amount below is a sample to replace.
 */

const extras: ExtraItem[] = [
  {
    id: "airport-pickup",
    name: "Airport pickup",
    description:
      "A driver meets you at arrivals. Add a second for the return trip.",
    unit: "per_stay",
    priceMinor: 2_500_000,
    maxQuantity: 2,
  },
  {
    id: "breakfast",
    name: "Breakfast",
    description: "A cooked breakfast each morning.",
    unit: "per_guest_per_night",
    priceMinor: 600_000,
    maxQuantity: 1,
  },
  {
    id: "parking",
    name: "Secure parking",
    description: "One car, parked on site.",
    unit: "per_night",
    priceMinor: 300_000,
    maxQuantity: 1,
  },
  {
    id: "welcome-drink",
    name: "Welcome drink",
    description: "A drink on arrival for each guest.",
    unit: "per_guest",
    priceMinor: 250_000,
    maxQuantity: 1,
  },
];

/** `demo` is a set of mock switches from the URL. See CHECKOUT-NOTES.md. */
export function getCheckoutSettings(demos: Set<string>): CheckoutSettings {
  const provider: PaymentProvider = demos.has("flutterwave")
    ? "flutterwave"
    : demos.has("stripe")
      ? "stripe"
      : "paystack";
  return {
    paymentMode: demos.has("athotel")
      ? "pay_at_hotel"
      : demos.has("deposit")
        ? "deposit"
        : "full",
    depositPercent: 30, // [sample]
    acceptedMethods: ["online", "bank_transfer"],
    provider,
    confirmationMode: demos.has("manual") ? "manual" : "instant",
    holdSeconds: demos.has("shorthold") ? 150 : 15 * 60,
    bank: {
      bankName: "[Bank name]",
      accountName: "[Account name]",
      accountNumber: "[0123456789]",
    },
    extras: demos.has("noextras") ? [] : extras,
    discount: demos.has("fees")
      ? { label: "Direct booking discount", percent: 5 }
      : null,
    otherLevy: demos.has("fees") ? { label: "Tourism levy", percent: 1 } : null,
    checkInTime24: "14:00",
    nonRefundable: demos.has("nonrefundable"),
    freeCancellationHours: hotelSettings.freeCancellationHours,
  };
}

export const parseDemos = (raw: string | null | undefined): Set<string> =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

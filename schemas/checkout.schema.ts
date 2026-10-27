import { z } from 'zod';

import { countries, dialFor } from '@/constants/countries';
import { ERROR_MESSAGES } from '@/constants/error-messages';

/** Shared by the browser (inline validation) and the server (the real check). */

export const MAX_REQUEST_LENGTH = 500;
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const arrivalOptions = [
  { value: 'before-12', label: 'Before 12:00' },
  { value: '12-14', label: '12:00 to 14:00' },
  { value: '14-16', label: '14:00 to 16:00' },
  { value: '16-18', label: '16:00 to 18:00' },
  { value: '18-20', label: '18:00 to 20:00' },
  { value: '20-22', label: '20:00 to 22:00' },
  { value: 'after-22', label: 'After 22:00' },
  { value: 'unsure', label: "I'm not sure yet" },
] as const;

/** Turns what a guest typed into +<country code><number>, or null if it cannot be a phone number. */
export function normalizePhone(
  input: string,
  countryCode: string,
): string | null {
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) {
    const dial = dialFor(countryCode);
    s = `+${dial}${s.replace(/^0+/, '')}`;
  }
  const digits = s.slice(1);
  if (!/^\d{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}

const countryCodes = countries.map((c) => c.code) as [string, ...string[]];
const arrivalValues = arrivalOptions.map((o) => o.value) as [
  string,
  ...string[],
];

const phoneCheck = (
  g: { phone: string; country: string },
  ctx: z.RefinementCtx,
) => {
  if (g.phone && normalizePhone(g.phone, g.country) === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['phone'],
      message: ERROR_MESSAGES.INVALID_PHONE,
    });
  }
};

/** The guest fields, shared by checkout and the manage page's "Edit details". */
export const guestFields = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, ERROR_MESSAGES.FULL_NAME_REQUIRED)
    .max(100, ERROR_MESSAGES.NAME_TOO_LONG)
    .refine((v) => v.includes(' '), ERROR_MESSAGES.FIRST_LAST_NAME_REQUIRED),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, ERROR_MESSAGES.EMAIL_REQUIRED)
    .email(ERROR_MESSAGES.EMAIL_INVALID),
  country: z.enum(countryCodes, { message: ERROR_MESSAGES.COUNTRY_REQUIRED }),
  phone: z.string().trim().min(1, ERROR_MESSAGES.PHONE_REQUIRED),
  arrivalTime: z.enum(arrivalValues, {
    message: ERROR_MESSAGES.ARRIVAL_REQUIRED,
  }),
  specialRequests: z
    .string()
    .max(
      MAX_REQUEST_LENGTH,
      ERROR_MESSAGES.REQUESTS_TOO_LONG(MAX_REQUEST_LENGTH),
    )
    .default(''),
});

export const guestSchema = guestFields
  .superRefine(phoneCheck)
  .transform((g) => ({
    ...g,
    phone: normalizePhone(g.phone, g.country) as string,
  }));

/** Editable on the manage page. Email is deliberately not editable there, to protect the booking lookup. */
export const detailsPatchSchema = guestFields
  .omit({ email: true })
  .superRefine(phoneCheck)
  .transform((g) => ({
    ...g,
    phone: normalizePhone(g.phone, g.country) as string,
  }));

export type GuestInput = z.input<typeof guestSchema>;
export type GuestDetails = z.output<typeof guestSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.INVALID_DATE);

export const extraSelectionSchema = z.object({
  id: z.string().min(1).max(40),
  quantity: z.number().int().min(0).max(10),
});

export const quoteRequestSchema = z.object({
  room: z.string().min(1).max(80),
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(6),
  extraBed: z.boolean(),
  extras: z.array(extraSelectionSchema).max(20),
  seenTotalMinor: z.number().int().nonnegative().nullish(),
});
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const reservationRequestSchema = quoteRequestSchema.extend({
  idempotencyKey: z.string().min(16).max(64),
  guest: guestSchema,
  /** The total the guest agreed to. If the server's total differs, the reservation is refused with price_changed. */
  expectedTotalMinor: z.number().int().positive(),
  termsAccepted: z.literal(true, {
    message: ERROR_MESSAGES.TERMS_ACCEPTANCE_REQUIRED,
  }),
  /** Honeypot: real guests never see or fill this. */
  website: z.string().max(200).optional(),
});
export type ReservationRequestInput = z.input<typeof reservationRequestSchema>;
export type ReservationRequest = z.output<typeof reservationRequestSchema>;

export const paymentInitSchema = z.object({
  reference: z.string().min(6).max(30),
  method: z.enum(['online', 'bank_transfer']),
  idempotencyKey: z.string().min(16).max(64),
  purpose: z.enum(['booking', 'change']).optional(),
  changeId: z.string().max(40).optional(),
});

/** Flattens Zod issues into { "guest.email": "message" }, keeping the first message per field. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function checkProofFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!(PROOF_TYPES as readonly string[]).includes(file.type))
    return ERROR_MESSAGES.PROOF_TYPE_INVALID;
  if (file.size > MAX_PROOF_BYTES)
    return ERROR_MESSAGES.PROOF_TOO_LARGE(MAX_PROOF_BYTES / 1024 / 1024);
  if (file.size === 0) return ERROR_MESSAGES.PROOF_EMPTY;
  return null;
}

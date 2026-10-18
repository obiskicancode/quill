import { z } from 'zod'
import { dialFor, countries } from './countries'

/** Shared by the browser (inline validation) and the server (the real check). */

export const MAX_REQUEST_LENGTH = 500
export const MAX_PROOF_BYTES = 5 * 1024 * 1024
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

export const arrivalOptions = [
  { value: 'before-12', label: 'Before 12:00' },
  { value: '12-14', label: '12:00 to 14:00' },
  { value: '14-16', label: '14:00 to 16:00' },
  { value: '16-18', label: '16:00 to 18:00' },
  { value: '18-20', label: '18:00 to 20:00' },
  { value: '20-22', label: '20:00 to 22:00' },
  { value: 'after-22', label: 'After 22:00' },
  { value: 'unsure', label: "I'm not sure yet" },
] as const

/** Turns what a guest typed into +<country code><number>, or null if it cannot be a phone number. */
export function normalizePhone(input: string, countryCode: string): string | null {
  let s = input.trim().replace(/[\s().-]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (!s.startsWith('+')) {
    const dial = dialFor(countryCode)
    s = `+${dial}${s.replace(/^0+/, '')}`
  }
  const digits = s.slice(1)
  if (!/^\d{7,15}$/.test(digits)) return null
  return `+${digits}`
}

const countryCodes = countries.map((c) => c.code) as [string, ...string[]]
const arrivalValues = arrivalOptions.map((o) => o.value) as [string, ...string[]]

const phoneCheck = (g: { phone: string; country: string }, ctx: z.RefinementCtx) => {
  if (g.phone && normalizePhone(g.phone, g.country) === null) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid phone number. Include the country code if it is not from your selected country.' })
  }
}

/** The guest fields, shared by checkout and the manage page's "Edit details". */
export const guestFields = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(100, 'Keep your name under 100 characters.')
    .refine((v) => v.includes(' '), 'Enter your first and last name.'),
  email: z.string().trim().toLowerCase().min(1, 'Enter your email address.').email('Enter a valid email address, like name@example.com.'),
  country: z.enum(countryCodes, { message: 'Choose your country.' }),
  phone: z.string().trim().min(1, 'Enter a phone number we can reach on WhatsApp.'),
  arrivalTime: z.enum(arrivalValues, { message: 'Choose roughly when you will arrive.' }),
  specialRequests: z.string().max(MAX_REQUEST_LENGTH, `Keep requests under ${MAX_REQUEST_LENGTH} characters.`).default(''),
})

export const guestSchema = guestFields.superRefine(phoneCheck).transform((g) => ({ ...g, phone: normalizePhone(g.phone, g.country) as string }))

/** Editable on the manage page. Email is deliberately not editable there, to protect the booking lookup. */
export const detailsPatchSchema = guestFields
  .omit({ email: true })
  .superRefine(phoneCheck)
  .transform((g) => ({ ...g, phone: normalizePhone(g.phone, g.country) as string }))

export type GuestInput = z.input<typeof guestSchema>
export type GuestDetails = z.output<typeof guestSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.')

export const extraSelectionSchema = z.object({ id: z.string().min(1).max(40), quantity: z.number().int().min(0).max(10) })

export const quoteRequestSchema = z.object({
  room: z.string().min(1).max(80),
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(6),
  extraBed: z.boolean(),
  extras: z.array(extraSelectionSchema).max(20),
  seenTotalMinor: z.number().int().nonnegative().nullish(),
  demo: z.string().max(120).nullish(),
})
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>

export const reservationRequestSchema = quoteRequestSchema.extend({
  idempotencyKey: z.string().min(16).max(64),
  guest: guestSchema,
  /** The total the guest agreed to. If the server's total differs, the reservation is refused with price_changed. */
  expectedTotalMinor: z.number().int().positive(),
  termsAccepted: z.literal(true, { message: 'Please accept the Terms, Privacy Policy and Cancellation Policy to continue.' }),
  /** Honeypot: real guests never see or fill this. */
  website: z.string().max(200).optional(),
})
export type ReservationRequestInput = z.input<typeof reservationRequestSchema>
export type ReservationRequest = z.output<typeof reservationRequestSchema>

export const paymentInitSchema = z.object({
  reference: z.string().min(6).max(30),
  method: z.enum(['online', 'bank_transfer']),
  idempotencyKey: z.string().min(16).max(64),
  demo: z.string().max(120).nullish(),
  purpose: z.enum(['booking', 'change']).optional(),
  changeId: z.string().max(40).optional(),
})

/** Flattens Zod issues into { "guest.email": "message" }, keeping the first message per field. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

export function checkProofFile(file: { type: string; size: number }): string | null {
  if (!(PROOF_TYPES as readonly string[]).includes(file.type)) return 'Upload a JPG, PNG, WebP or PDF file.'
  if (file.size > MAX_PROOF_BYTES) return `The file is too large. Keep it under ${MAX_PROOF_BYTES / 1024 / 1024} MB.`
  if (file.size === 0) return 'That file is empty. Choose another.'
  return null
}

import { z } from 'zod'

export const referenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{6,30}$/, 'Enter the booking reference from your email, like DEA-AB12CD.')

/** The verify form. Used by the browser and the server. */
export const verifyRequestSchema = z.object({
  reference: referenceSchema,
  email: z.string().trim().toLowerCase().min(1, 'Enter the email you booked with.').email('Enter a valid email address.'),
  /** 'manage' opens a 30-minute management session; 'view' is the confirmation page. */
  scope: z.enum(['view', 'manage']).default('view'),
})
export type VerifyRequest = z.input<typeof verifyRequestSchema>

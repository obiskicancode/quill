import { z } from 'zod'
import { normalizePhone } from '../checkout/schemas'
import { ENQUIRY_TOPICS, type EnquiryTopic } from './types'

/** Shared by the contact form (inline validation) and POST /api/enquiries (the real check). */

export const topicLabels: Record<EnquiryTopic, string> = {
  general: 'General enquiry',
  group_booking: 'Group booking',
  event_conference: 'Event or conference',
  corporate_account: 'Corporate account',
  complaint_feedback: 'Complaint or feedback',
  booking_enquiry: 'Booking enquiry',
}

/** Topics that also ask for stay details. */
export const STAY_TOPICS: EnquiryTopic[] = ['group_booking', 'event_conference']

/** Topics where the dates and guest numbers are required, not optional. */
export const STAY_REQUIRED_TOPICS: EnquiryTopic[] = ['booking_enquiry']

export const MAX_MESSAGE = 2000

/** Maps links from other pages (older topic names, ?topic=price) onto the real topics. */
export function normalizeTopic(raw: string | null | undefined): EnquiryTopic {
  if (!raw) return 'general'
  if ((ENQUIRY_TOPICS as readonly string[]).includes(raw)) return raw as EnquiryTopic
  if (raw === 'booking' || raw === 'booking_enquiry') return 'booking_enquiry'
  if (raw === 'group') return 'group_booking'
  if (raw === 'event' || raw === 'conference') return 'event_conference'
  if (raw === 'corporate') return 'corporate_account'
  if (raw === 'complaint' || raw === 'feedback') return 'complaint_feedback'
  return 'general'
}

const isoOrEmpty = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Choose a valid date.')

export const enquiryFields = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100, 'Keep your name under 100 characters.'),
  email: z.string().trim().toLowerCase().min(1, 'Enter your email address.').email('Enter a valid email address, like name@example.com.'),
  phone: z.string().trim().max(30, 'That phone number is too long.').default(''),
  topic: z.enum(ENQUIRY_TOPICS, { message: 'Choose what your message is about.' }),
  subject: z.string().trim().max(120, 'Keep the subject under 120 characters.').default(''),
  message: z.string().trim().min(10, 'Tell us a little more, at least 10 characters.').max(MAX_MESSAGE, `Keep your message under ${MAX_MESSAGE.toLocaleString('en-NG')} characters.`),
  checkIn: isoOrEmpty.default(''),
  checkOut: isoOrEmpty.default(''),
  guests: z.string().regex(/^\d{0,4}$/, 'Enter the number of guests as a whole number.').default(''),
  /** Booking enquiry: adults and children are asked separately. */
  adults: z.string().regex(/^\d{0,2}$/, 'Enter the number of adults as a whole number.').default(''),
  children: z.string().regex(/^\d{0,2}$/, 'Enter the number of children as a whole number.').default(''),
  roomType: z.string().max(80).default(''),
  /** Which page sent this. Helps the hotel spot a broken link. */
  source_page: z.string().trim().max(40).default(''),
  consent: z.literal(true, { message: 'Please agree to the Privacy Policy so we can reply to you.' }),
})

type Fields = z.infer<typeof enquiryFields>

function refine(v: Pick<Fields, 'phone' | 'topic' | 'checkIn' | 'checkOut' | 'guests' | 'adults'>, ctx: z.RefinementCtx) {
  if (v.phone && normalizePhone(v.phone, 'NG') === null) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid phone number. Include the country code if it is not a Nigerian number.' })
  }
  const stayShown = STAY_TOPICS.includes(v.topic) || STAY_REQUIRED_TOPICS.includes(v.topic)
  if (stayShown && v.checkIn && v.checkOut && v.checkOut <= v.checkIn) {
    ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Check-out must be after check-in.' })
  }
  if (STAY_REQUIRED_TOPICS.includes(v.topic)) {
    if (!v.checkIn) ctx.addIssue({ code: 'custom', path: ['checkIn'], message: 'Choose your check-in date.' })
    if (!v.checkOut) ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Choose your check-out date.' })
    if (Number(v.adults || v.guests) < 1) ctx.addIssue({ code: 'custom', path: ['adults'], message: 'Enter at least 1 adult.' })
  }
  if (v.guests && Number(v.guests) < 1) ctx.addIssue({ code: 'custom', path: ['guests'], message: 'Enter at least 1 guest.' })
}

/** What the browser validates before sending. */
export const enquiryFormSchema = enquiryFields.superRefine(refine)

/** What the server accepts: the form plus an idempotency key and the honeypot. */
export const enquirySchema = enquiryFields
  .extend({
    idempotencyKey: z.string().min(16).max(64),
    /** Honeypot: people never see or fill this. */
    website: z.string().max(200).optional(),
    /** Dev-only preview switch (ratelimit, error). Ignored in production. */
    demo: z.string().max(40).nullish(),
  })
  .superRefine(refine)

export type EnquiryFormInput = z.input<typeof enquiryFormSchema>
export type EnquiryRequest = z.output<typeof enquirySchema>

export interface EnquiryResponse {
  reference: string
  responseHours: number
}

export interface EnquiryError {
  code: 'validation' | 'rate_limited' | 'server'
  message: string
  fieldErrors?: Record<string, string>
  retryAfterSeconds?: number
}

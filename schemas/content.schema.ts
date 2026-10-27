import { z } from 'zod';

import { ENQUIRY_TOPICS } from '@/constants/content';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { normalizePhone } from '@/schemas/checkout.schema';
import type { EnquiryTopic } from '@/types/content.types';

/** Shared by the contact form (inline validation) and POST /api/enquiries (the real check). */

export const topicLabels: Record<EnquiryTopic, string> = {
  general: 'General enquiry',
  group_booking: 'Group booking',
  event_conference: 'Event or conference',
  corporate_account: 'Corporate account',
  complaint_feedback: 'Complaint or feedback',
  booking_enquiry: 'Booking enquiry',
};

/** Topics that also ask for stay details. */
export const STAY_TOPICS: EnquiryTopic[] = [
  'group_booking',
  'event_conference',
];

/** Topics where the dates and guest numbers are required, not optional. */
export const STAY_REQUIRED_TOPICS: EnquiryTopic[] = ['booking_enquiry'];

export const MAX_MESSAGE = 2000;

/** Maps links from other pages (older topic names, ?topic=price) onto the real topics. */
export function normalizeTopic(raw: string | null | undefined): EnquiryTopic {
  if (!raw) return 'general';
  if ((ENQUIRY_TOPICS as readonly string[]).includes(raw))
    return raw as EnquiryTopic;
  if (raw === 'booking' || raw === 'booking_enquiry') return 'booking_enquiry';
  if (raw === 'group') return 'group_booking';
  if (raw === 'event' || raw === 'conference') return 'event_conference';
  if (raw === 'corporate') return 'corporate_account';
  if (raw === 'complaint' || raw === 'feedback') return 'complaint_feedback';
  return 'general';
}

const isoOrEmpty = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Choose a valid date.');

export const enquiryFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(100, ERROR_MESSAGES.NAME_TOO_LONG),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, ERROR_MESSAGES.EMAIL_REQUIRED)
    .email(ERROR_MESSAGES.EMAIL_INVALID),
  phone: z.string().trim().max(30, ERROR_MESSAGES.PHONE_TOO_LONG).default(''),
  topic: z.enum(ENQUIRY_TOPICS, {
    message: ERROR_MESSAGES.TOPIC_REQUIRED,
  }),
  subject: z
    .string()
    .trim()
    .max(120, ERROR_MESSAGES.SUBJECT_TOO_LONG)
    .default(''),
  message: z
    .string()
    .trim()
    .min(10, ERROR_MESSAGES.ENQUIRY_MESSAGE_TOO_SHORT)
    .max(MAX_MESSAGE, ERROR_MESSAGES.ENQUIRY_MESSAGE_TOO_LONG(MAX_MESSAGE)),
  checkIn: isoOrEmpty.default(''),
  checkOut: isoOrEmpty.default(''),
  guests: z
    .string()
    .regex(/^\d{0,4}$/, ERROR_MESSAGES.GUESTS_INVALID)
    .default(''),
  /** Booking enquiry: adults and children are asked separately. */
  adults: z
    .string()
    .regex(/^\d{0,2}$/, ERROR_MESSAGES.ADULTS_INVALID)
    .default(''),
  children: z
    .string()
    .regex(/^\d{0,2}$/, ERROR_MESSAGES.CHILDREN_INVALID)
    .default(''),
  roomType: z.string().max(80).default(''),
  /** Which page sent this. Helps the hotel spot a broken link. */
  source_page: z.string().trim().max(40).default(''),
  consent: z.literal(true, {
    message: ERROR_MESSAGES.CONSENT_REQUIRED,
  }),
});

type Fields = z.infer<typeof enquiryFields>;

function refine(
  v: Pick<
    Fields,
    'phone' | 'topic' | 'checkIn' | 'checkOut' | 'guests' | 'adults'
  >,
  ctx: z.RefinementCtx,
) {
  if (v.phone && normalizePhone(v.phone, 'NG') === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['phone'],
      message: ERROR_MESSAGES.INVALID_NIGERIAN_PHONE,
    });
  }
  const stayShown =
    STAY_TOPICS.includes(v.topic) || STAY_REQUIRED_TOPICS.includes(v.topic);
  if (stayShown && v.checkIn && v.checkOut && v.checkOut <= v.checkIn) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOut'],
      message: ERROR_MESSAGES.CHECKOUT_AFTER_CHECKIN,
    });
  }
  if (STAY_REQUIRED_TOPICS.includes(v.topic)) {
    if (!v.checkIn)
      ctx.addIssue({
        code: 'custom',
        path: ['checkIn'],
        message: ERROR_MESSAGES.CHECKIN_REQUIRED,
      });
    if (!v.checkOut)
      ctx.addIssue({
        code: 'custom',
        path: ['checkOut'],
        message: ERROR_MESSAGES.CHECKOUT_REQUIRED,
      });
    if (Number(v.adults || v.guests) < 1)
      ctx.addIssue({
        code: 'custom',
        path: ['adults'],
        message: ERROR_MESSAGES.ADULT_REQUIRED,
      });
  }
  if (v.guests && Number(v.guests) < 1)
    ctx.addIssue({
      code: 'custom',
      path: ['guests'],
      message: ERROR_MESSAGES.GUEST_REQUIRED,
    });
}

/** What the browser validates before sending. */
export const enquiryFormSchema = enquiryFields.superRefine(refine);

/** What the server accepts: the form plus an idempotency key and the honeypot. */
export const enquirySchema = enquiryFields
  .extend({
    idempotencyKey: z.string().min(16).max(64),
    /** Honeypot: people never see or fill this. */
    website: z.string().max(200).optional(),
  })
  .superRefine(refine);

export type EnquiryFormInput = z.input<typeof enquiryFormSchema>;
export type EnquiryRequest = z.output<typeof enquirySchema>;

export interface EnquiryResponse {
  reference: string;
  responseHours: number;
}

export interface EnquiryError {
  code:
    | typeof ERROR_CODES.VALIDATION
    | typeof ERROR_CODES.RATE_LIMITED
    | typeof ERROR_CODES.SERVER;
  message: string;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
}

import type { EnquiryRequest } from './schemas'

/**
 * MOCK enquiry storage and notifications (in memory). Replace with your database and mailer.
 * Each enquiry is stored with type and status "new". Three emails follow: the contact form recipient,
 * the hotel's notification recipients, and an auto-reply to the guest. No personal data is logged.
 */
export interface StoredEnquiry {
  reference: string
  type: EnquiryRequest['topic']
  status: 'new'
  createdAt: number
  /** The page the guest sent this from, so the hotel can spot a broken link. */
  sourcePage: string
  fields: Omit<EnquiryRequest, 'idempotencyKey' | 'website' | 'demo' | 'consent' | 'source_page'>
}

export interface EnquiryEmail {
  at: number
  reference: string
  to: 'contact_form_recipient' | 'notification_recipients' | 'guest_auto_reply'
}

interface EnquiryStore {
  rows: Map<string, StoredEnquiry>
  keys: Map<string, string>
  outbox: EnquiryEmail[]
  failedOnce: Set<string>
}

const g = globalThis as unknown as { __deaEnquiries?: EnquiryStore }
export const enquiryStore: EnquiryStore = (g.__deaEnquiries ??= { rows: new Map(), keys: new Map(), outbox: [], failedOnce: new Set() })

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function enquiryReference(): string {
  let r = 'ENQ-'
  for (let i = 0; i < 6; i++) r += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return r
}

export function saveEnquiry(req: EnquiryRequest): StoredEnquiry {
  const { idempotencyKey, website: _w, demo: _d, consent: _c, source_page, ...fields } = req
  const row: StoredEnquiry = { reference: enquiryReference(), type: req.topic, status: 'new', createdAt: Date.now(), sourcePage: source_page, fields }
  enquiryStore.rows.set(row.reference, row)
  enquiryStore.keys.set(idempotencyKey, row.reference)
  const at = Date.now()
  for (const to of ['contact_form_recipient', 'notification_recipients', 'guest_auto_reply'] as const) enquiryStore.outbox.push({ at, reference: row.reference, to })
  return row
}

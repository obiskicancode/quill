import type { EnquiryResponse } from '@/schemas/content.schema';

import BaseService from './base.service';

/** The contact/enquiry form payload plus the idempotency key and the honeypot. */
export interface EnquirySubmitInput {
  name: string;
  email: string;
  phone: string;
  topic: string;
  subject: string;
  message: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  adults?: string;
  children?: string;
  roomType: string;
  source_page?: string;
  consent: boolean;
  idempotencyKey: string;
  website?: string;
}

/** Typed fetch helpers for the contact and booking enquiry forms. Retries are safe: the same key never sends twice. */
class ContentService extends BaseService {
  constructor() {
    super('');
  }

  sendEnquiry(body: EnquirySubmitInput) {
    return this.httpPost<EnquirySubmitInput, EnquiryResponse>(
      '/enquiries',
      body,
    );
  }
}

export const contentService = new ContentService();

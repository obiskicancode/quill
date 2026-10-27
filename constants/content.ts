export const ENQUIRY_TOPICS = [
  'general',
  'group_booking',
  'event_conference',
  'corporate_account',
  'complaint_feedback',
  'booking_enquiry',
] as const;

/** The topics shown in the contact form's dropdown. The booking enquiry form uses its own topic. */
export const CONTACT_TOPICS = ENQUIRY_TOPICS.filter(
  (topic) => topic !== 'booking_enquiry',
);

export const POLICY_SLUGS = [
  'terms',
  'privacy',
  'cancellation-policy',
  'house-rules',
] as const;

export const GALLERY_CATEGORIES = [
  'rooms',
  'facilities',
  'exterior',
  'dining',
  'events',
  'surroundings',
] as const;

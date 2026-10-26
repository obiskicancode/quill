export const ERROR_MESSAGES = {
  // General request errors
  SOME_DETAILS_NEED_FIXING: 'Some details need fixing.',
  CHECK_STAY_DETAILS: 'Check the stay details and try again.',
  REQUEST_MISSING_DETAILS: 'Something is missing from the request.',
  CHOOSE_VALID_DATES: 'Choose valid dates.',
  CHECK_FORM: 'Please check the form.',
  REQUEST_REJECTED: 'We could not process this request.',

  // Rooms, availability and pricing
  PRICE_CALCULATION_FAILED: "We couldn't calculate your price.",
  CHOOSE_DATES: 'Choose your dates.',
  CHECK_GUEST_COUNT: 'Check the number of guests.',
  NO_ROOMS_FOR_DATES: 'No rooms matched those dates.',
  AVAILABILITY_UNAVAILABLE: 'Availability is unavailable.',
  ITEM_NOT_FOUND: 'That item could not be found.',
  ROOM_NOT_FOUND: 'Room not found.',
  PRICING_UNAVAILABLE: 'Pricing is unavailable.',
  ROOM_UNAVAILABLE_DATES: 'That room is no longer available for these dates.',
  ROOM_UNAVAILABLE: 'That room is unavailable.',
  GROUP_UNAVAILABLE: 'This room cannot take your group for these dates.',
  ROOM_NOT_BOOKABLE_ONLINE: 'That room cannot be booked online.',

  // Stay and search rules
  CHECKOUT_AFTER_CHECKIN: 'Check-out must be after check-in.',
  SEARCH_DATES_REQUIRED: 'Choose your check-in and check-out dates.',
  SEARCH_ADULT_REQUIRED: 'At least one adult is needed.',
  CHECKIN_IN_PAST: "Check-in can't be in the past.",
  SAME_DAY_CUTOFF: (cutoff: string) =>
    `Same-day bookings close at ${cutoff}. Choose tomorrow or later.`,
  MIN_NIGHTS: (minNights: number) =>
    `This room needs a stay of at least ${minNights} ${minNights === 1 ? 'night' : 'nights'}.`,
  MAX_NIGHTS: (maxNights: number) =>
    `The longest stay we take online is ${maxNights} nights. For longer stays, message us.`,
  BOOKING_WINDOW: (days: number) =>
    `We take bookings up to ${days} days ahead. Choose an earlier date.`,
  ROOM_CAPACITY: (adults: number, children: number) =>
    `This room sleeps up to ${adults} adults and ${children} children.`,
  EXTRA_BED_REQUIRED: (guests: number, bedPrice: string) =>
    `${guests} guests need the extra bed (${bedPrice}). Add it, or reduce the number of guests.`,

  // Online payments
  ONLINE_PAYMENTS_UNAVAILABLE: 'Online payments are not available yet.',
  INVALID_PAYMENT_REQUEST: 'Invalid payment request.',
  HOLD_EXPIRED: 'The hold on this room has ended.',
  EMAIL_REQUIRED_FOR_ONLINE_PAYMENT:
    'Add an email address before paying online.',
  PAYMENT_PROVIDER_UNREACHABLE:
    "We couldn't reach the payment provider. Try again.",
  NOTHING_TO_PAY_ONLINE: 'Nothing to pay online for this reservation.',
  RESERVATION_ALREADY_PROCESSING:
    'This reservation is already being processed.',
  PAYMENTS_NOT_CONFIGURED: 'Payments are not configured.',
  INVALID_SIGNATURE: 'Invalid signature.',
  INVALID_EVENT: 'Invalid event.',
  WEBHOOK_PROCESSING_FAILED: 'Webhook processing failed.',
  WEBHOOK_FAILED: 'Webhook failed.',

  // Reservations and verification
  RESERVATION_NOT_FOUND: 'Reservation not found.',
  BOOKING_NOT_FOUND: 'Booking not found.',
  SESSION_EXPIRED: 'Your session has ended. Please verify again.',
  VERIFY_BOOKING_FIRST: 'Verify your booking first.',
  WAIT_FOR_EMAIL: 'Please wait before asking for another email.',
  VERIFY_BOOKING_TO_VIEW: 'Verify your booking to see it.',
  BOOKING_LOAD_FAILED: 'We could not load your booking.',
  VERIFY_TOO_MANY_ATTEMPTS:
    'Too many attempts. Please wait before trying again.',
  VERIFY_NOT_FOUND:
    "We couldn't find a booking with those details. Check the reference and email and try again.",
  BOOKING_RATE_LIMITED:
    'Too many attempts. Please wait a minute and try again.',
  PRICE_CHANGED: 'The price has changed.',

  // Managing a booking
  CANNOT_CANCEL_ONLINE: 'This booking cannot be cancelled online.',
  REFUND_PREVIEW_CHANGED: 'The refund amount has changed. Please review it.',
  NO_PENDING_DATE_CHANGE: 'There is no date change waiting for payment.',
  CHANGE_AWAITING_VERIFICATION:
    'This change is already waiting for verification.',
  CHANGE_NOT_AWAITING_TRANSFER:
    'This date change is not waiting for a transfer.',
  RESERVATION_NOT_AWAITING_TRANSFER:
    'This reservation is not waiting for a transfer.',
  MANAGE_RATE_LIMITED: 'Too many requests. Please wait a moment.',
  CSRF_FAILED:
    'This request could not be verified. Reload the page and try again.',
  QUOTE_STALE:
    'The price or availability changed. Please review the new details.',
  CURRENT_DATES: 'Those are your current dates. Choose different dates.',
  DATES_CANNOT_CHANGE_ONLINE: "Dates can't be changed online.",
  ROOM_CANNOT_CHANGE_ONLINE: "This room can't be changed online.",
  NOTE_TOO_LONG: 'Keep your note under 300 characters.',
  CANCEL_ACKNOWLEDGEMENT_REQUIRED:
    'Please confirm that you understand this cannot be undone.',

  // Transfer proofs
  CHOOSE_RECEIPT: 'Choose a receipt to upload.',
  RECEIPT_UPLOADS_UNAVAILABLE:
    'Receipt uploads are temporarily unavailable. Please email it to us.',
  RECEIPT_STORAGE_FAILED: "We couldn't store the receipt. Please try again.",
  PROOF_TYPE_INVALID: 'Upload a JPG, PNG, WebP or PDF file.',
  PROOF_TOO_LARGE: (maxMb: number) =>
    `The file is too large. Keep it under ${maxMb} MB.`,
  PROOF_EMPTY: 'That file is empty. Choose another.',

  // Enquiries
  RATE_LIMITED_ENQUIRY:
    'You have sent a few messages already. Please wait a few minutes, or message us on WhatsApp.',
  TOPIC_REQUIRED: 'Choose what your message is about.',
  SUBJECT_TOO_LONG: 'Keep the subject under 120 characters.',
  ENQUIRY_MESSAGE_TOO_SHORT: 'Tell us a little more, at least 10 characters.',
  ENQUIRY_MESSAGE_TOO_LONG: (max: number) =>
    `Keep your message under ${max.toLocaleString('en-NG')} characters.`,

  // Guest and contact forms
  INVALID_PHONE:
    'Enter a valid phone number. Include the country code if it is not from your selected country.',
  FULL_NAME_REQUIRED: 'Enter your full name.',
  NAME_TOO_LONG: 'Keep your name under 100 characters.',
  FIRST_LAST_NAME_REQUIRED: 'Enter your first and last name.',
  EMAIL_INVALID: 'Enter a valid email address, like name@example.com.',
  EMAIL_REQUIRED: 'Enter your email address.',
  COUNTRY_REQUIRED: 'Choose your country.',
  PHONE_REQUIRED: 'Enter a phone number we can reach on WhatsApp.',
  ARRIVAL_REQUIRED: 'Choose roughly when you will arrive.',
  REQUESTS_TOO_LONG: (max: number) => `Keep requests under ${max} characters.`,
  INVALID_DATE: 'Invalid date.',
  TERMS_ACCEPTANCE_REQUIRED:
    'Please accept the Terms, Privacy Policy and Cancellation Policy to continue.',
  PHONE_TOO_LONG: 'That phone number is too long.',
  GUESTS_INVALID: 'Enter the number of guests as a whole number.',
  ADULTS_INVALID: 'Enter the number of adults as a whole number.',
  CHILDREN_INVALID: 'Enter the number of children as a whole number.',
  CONSENT_REQUIRED:
    'Please agree to the Privacy Policy so we can reply to you.',
  INVALID_NIGERIAN_PHONE:
    'Enter a valid phone number. Include the country code if it is not a Nigerian number.',
  CHECKIN_REQUIRED: 'Choose your check-in date.',
  CHECKOUT_REQUIRED: 'Choose your check-out date.',
  ADULT_REQUIRED: 'Enter at least 1 adult.',
  GUEST_REQUIRED: 'Enter at least 1 guest.',

  // Settings and content
  HOTEL_SETTINGS_MISSING: 'Hotel settings are missing.',
  HOTEL_PRICING_SETTINGS_MISSING: 'Hotel pricing settings are missing.',
  PAGE_NOT_PUBLISHED: (slug: string) => `The "${slug}" page is not published.`,

  // Payment providers
  UNKNOWN_PAYMENT_PROVIDER: 'Unknown payment provider.',
  UNSUPPORTED_PAYMENT_PROVIDER: (provider: string) =>
    `Unsupported payment provider: ${provider}`,
  PAYMENT_PROVIDER_ADAPTER_MISSING: (id: string) =>
    `No payment provider adapter is registered for ${id}.`,
  PAYSTACK_NOT_CONFIGURED: 'Paystack is not configured.',
  PAYMENT_PROVIDER_REJECTED: 'The payment provider rejected the request.',
  PAYMENT_NOT_APPLIED: (reference: string) =>
    `Payment ${reference} could not be applied.`,

  // Storage providers
  STORAGE_PROVIDER_ADAPTER_MISSING: (id: string) =>
    `No storage provider adapter is registered for ${id}.`,
  PROOF_STORAGE_NOT_CONFIGURED: 'Proof storage is not configured.',
  S3_CREDENTIALS_MISSING: 'S3 credentials are not configured.',
  S3_BUCKET_MISSING: 'S3 bucket is not configured.',

  // Admin authentication
  ADMIN_INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ADMIN_ACCOUNT_LOCKED:
    'Too many failed attempts. Try again after the countdown.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  ADMIN_SESSION_EXPIRED: 'Your session expired. Sign in again to continue.',
  ADMIN_FORBIDDEN: 'You do not have permission to view that page.',
  ADMIN_MFA_REQUIRED: 'Enter the code from your authenticator app.',
  ADMIN_MFA_INVALID: 'That code is not valid. Try again.',
  ADMIN_MFA_EXPIRED: 'Your sign-in attempt expired. Start again.',
  ADMIN_MFA_SETUP_REQUIRED:
    'Owners must set up two-factor authentication before continuing.',
  ADMIN_MFA_NOT_ENABLED: 'Two-factor authentication is not enabled.',
  ADMIN_MFA_ALREADY_ENABLED:
    'Two-factor authentication is already enabled. Disable it first to set it up again.',
  ADMIN_OWNER_MFA_CANNOT_DISABLE:
    'Owners must keep two-factor authentication enabled.',
  ADMIN_CURRENT_PASSWORD_INVALID: 'Your current password is incorrect.',
  ADMIN_PASSWORD_TOO_SHORT: 'Use at least 10 characters for your password.',
  ADMIN_PASSWORD_TOO_LONG: 'Keep your password under 200 characters.',
  ADMIN_PASSWORD_TOO_COMMON:
    'That password is too common. Choose something less predictable.',
  ADMIN_PASSWORD_MISMATCH: 'The passwords do not match.',
  ADMIN_PASSWORD_UNCHANGED: 'Choose a password you have not used here before.',
  ADMIN_RESET_INVALID: 'This reset link is invalid or has expired.',
  ADMIN_RESET_SENT:
    'If that email belongs to a staff account, a reset link has been sent.',
  ADMIN_RECOVERY_INVALID: 'That recovery code is not valid or has been used.',
  ADMIN_CSRF_FAILED:
    'This request could not be verified. Reload the page and try again.',
  ADMIN_NAME_REQUIRED: 'Enter a first and last name.',
  ADMIN_NAME_TOO_LONG: 'Keep names under 100 characters.',
  ADMIN_EMAIL_TOO_LONG: 'Keep the email address under 255 characters.',
  ADMIN_PHONE_TOO_LONG: 'Keep the phone number under 30 characters.',
  ADMIN_SERVER_ERROR: 'Something went wrong. Please try again.',
  ADMIN_2FA_SETUP_STARTED:
    'Scan the QR code, then enter a code from your app to finish.',
  ADMIN_2FA_ENABLED: 'Two-factor authentication is now enabled.',
  ADMIN_2FA_DISABLED: 'Two-factor authentication is disabled.',
  ADMIN_RECOVERY_CODES_ROTATED:
    'New recovery codes were generated. The old codes no longer work.',

  // Environment and app configuration
  BOOKING_COOKIE_SECRET_MISSING:
    'BOOKING_COOKIE_SECRET must be set in production',
  JWT_SECRETS_MISSING:
    'JWT secrets are not defined in the environment variables.',
  DATABASE_URL_MISSING:
    'Database URL is not defined in the environment variables.',

  // Consent
  CONSENT_PROVIDER_MISSING: 'useConsent must be used within ConsentProvider',

  // Site settings
  SITE_PROVIDER_MISSING: 'useSite must be used within SiteProvider',
} as const;

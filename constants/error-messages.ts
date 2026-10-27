export const ERROR_MESSAGES = {
  // Guest booking and stay
  ADD_EXTRAS_NOT_OFFERED:
    "Extras can't be added after booking online. Contact us if you need to add one.",
  AVAILABILITY_UNAVAILABLE:
    "We couldn't check availability right now. Please try again.",
  BOOKING_CANNOT_CANCEL_ONLINE:
    "This booking can't be cancelled online anymore.",
  BOOKING_EMAIL_REQUIRED: 'Enter the email you booked with.',
  BOOKING_LOAD_FAILED: "We couldn't load your booking. Please try again.",
  BOOKING_NOT_CANCELLED_YET: "The booking hasn't been cancelled yet.",
  BOOKING_NOT_FOUND: "We couldn't find that booking.",
  BOOKING_RATE_LIMITED:
    'Too many attempts. Please wait a minute and try again.',
  BOOKING_REFERENCE_INVALID:
    'Enter the booking reference from your email, like DEA-AB12CD.',
  BOOKING_STATUS_CHANGED:
    'Your booking status changed. The page has been updated.',
  BOOKING_WINDOW: (days: number) =>
    `We take bookings up to ${days} days ahead. Choose an earlier date.`,
  CANCEL_ACKNOWLEDGEMENT_REQUIRED:
    'Please confirm that you understand this cannot be undone.',
  CHANGES_NOT_SAVED: "Your changes weren't saved.",
  CHANGE_WINDOW: (hours: number) =>
    `You can change dates online up to ${hours} hours before check-in.`,
  CHECKIN_IN_PAST: "Check-in can't be in the past.",
  CHECKIN_IN_PAST_LATER_DATE:
    "Check-in can't be in the past. Choose a later date.",
  CHECKOUT_AFTER_CHECKIN: 'Check-out must be after check-in.',
  CHECKOUT_AFTER_CHECKIN_NEW_DATES:
    'Check-out must be after check-in. Choose new dates.',
  CHECKOUT_AFTER_CHECKIN_UI: 'Check-out must be after check-in.',
  CHECK_FORM: 'Please check the highlighted details and try again.',
  CHECK_GUEST_COUNT: 'Choose the right number of guests.',
  CHECK_PRICE_AVAILABILITY_FIRST: 'Check the price and availability first.',
  CHECK_STAY_DETAILS: 'Please check the stay details and try again.',
  CHOOSE_CHECKOUT_OR_CLEAR: 'Choose a check-out date, or clear the dates.',
  CHOOSE_DATES: 'Choose your dates.',
  CHOOSE_VALID_DATES: 'Choose a valid check-in and check-out date.',
  CURRENT_DATES: 'Those are your current dates. Choose different dates.',
  DATES_CANNOT_BE_USED: "Those dates can't be used.",
  DATES_CANNOT_CHANGE_ONLINE: "Dates can't be changed online.",
  DATES_CANNOT_CHANGE_ONLINE_TITLE: "Dates can't be changed online",
  DATES_NOT_CHANGED_YET: "Your dates haven't been changed yet.",
  DATES_ONLY_PENDING_CONFIRMED:
    'Dates can only be changed for pending or confirmed reservations.',
  DATE_CHANGE_AWAITING_PAYMENT:
    'A date change is waiting for payment. Finish it or let it expire first.',
  EXTRA_BED_REQUIRED: (guests: number, bedPrice: string) =>
    `${guests} guests need the extra bed (${bedPrice}). Add it, or reduce the number of guests.`,
  GROUP_UNAVAILABLE: "This room can't take your group for these dates.",
  INVALID_EMAIL_ADDRESS: 'Enter a valid email address.',
  ITEM_NOT_FOUND: "We couldn't find that item.",
  MAX_DATE_CHANGES: (count: number) =>
    `This booking has already been changed ${count} ${count === 1 ? 'time' : 'times'}, which is the most we allow online.`,
  MAX_NIGHTS: (maxNights: number) =>
    `The longest stay we take online is ${maxNights} nights. For longer stays, message us.`,
  MIN_NIGHTS: (minNights: number) =>
    `This room needs a stay of at least ${minNights} ${minNights === 1 ? 'night' : 'nights'}.`,
  NOTE_TOO_LONG: 'Keep your note under 300 characters.',
  NOT_AVAILABLE_FOR_DATES: "That room isn't available for these dates.",
  NOT_FOUND_BARE: "We couldn't find that.",
  NO_ROOMS_FOR_DATES: 'No rooms matched those dates.',
  NO_SHOW_CANNOT_CANCEL_ONLINE:
    "This booking was marked as a no-show, so it can't be cancelled online.",
  PAYMENT_FAILED_NOTHING_TO_CANCEL:
    "That payment didn't go through, so there's nothing to cancel.",
  PRICE_CALCULATION_FAILED: "We couldn't calculate your price.",
  PRICE_CHANGED: 'The price has changed. Please review the new total.',
  PRICING_UNAVAILABLE:
    "We couldn't load the price right now. Please try again.",
  QUOTE_STALE:
    'The price or availability changed. Please review the new details.',
  RESERVATION_NOT_FOUND: "We couldn't find that reservation.",
  ROOM_CANNOT_CHANGE_ONLINE: "This room can't be changed online.",
  ROOM_CAPACITY: (adults: number, children: number) =>
    `This room sleeps up to ${adults} adults and ${children} children.`,
  ROOM_NOT_BOOKABLE_ONLINE: "That room can't be booked online.",
  ROOM_NOT_FOUND: "We couldn't find that room.",
  ROOM_NOT_FOUND_BARE: "We couldn't find that room.",
  ROOM_UNAVAILABLE: "That room isn't available.",
  ROOM_UNAVAILABLE_DATES: 'That room is no longer available for these dates.',
  SAME_DAY_CUTOFF: (cutoff: string) =>
    `Same-day bookings close at ${cutoff}. Choose tomorrow or later.`,
  SEARCH_ADULT_REQUIRED: 'Add at least one adult.',
  SEARCH_DATES_REQUIRED: 'Choose your check-in and check-out dates.',
  SELECT_AVAILABLE_ROOM: 'Choose an available room.',
  SELECT_VALID_STAY_AND_ROOM: 'Choose valid stay dates and an available room.',
  SESSION_EXPIRED: 'Your session has ended. Please verify again.',
  SOME_DETAILS_NEED_FIXING:
    'Some details need fixing. Please check the highlighted fields.',
  STAY_COMPLETE_NOTHING_TO_CANCEL:
    "This stay is already complete, so there's nothing to cancel.",
  VALID_EMAIL_REQUIRED: 'Enter a valid email address.',
  VERIFY_BOOKING_FIRST: 'Verify your booking first.',
  VERIFY_BOOKING_TO_VIEW: 'Verify your booking to see it.',
  VERIFY_NOT_FOUND:
    "We couldn't find a booking with those details. Check the reference and email and try again.",
  VERIFY_TOO_MANY_ATTEMPTS:
    'Too many attempts. Please wait before trying again.',
  WAIT_FOR_EMAIL: 'Please wait before asking for another email.',

  // Checkout, payments and receipts
  CHOOSE_RECEIPT: 'Choose a receipt to upload.',
  CHOOSE_TRANSFER_RECEIPT: 'Choose your transfer receipt to upload.',
  COULD_NOT_CANCEL_BOOKING:
    'We could not cancel this booking. Please try again.',
  COULD_NOT_CHANGE_DATES: 'We could not change your dates. Please try again.',
  COULD_NOT_CHECK_AVAILABILITY:
    "We couldn't check availability. Please try again.",
  COULD_NOT_CHECK_DATES: "We couldn't check those dates. Please try again.",
  COULD_NOT_FIND_BOOKING: "We couldn't find that booking. Please try again.",
  COULD_NOT_LOAD_BOOKING: "We couldn't load your booking. Please try again.",
  COULD_NOT_OPEN_CHECKOUT: "We couldn't open checkout. Please try again.",
  COULD_NOT_REACH_SERVER_CANCEL_UNKNOWN:
    "We couldn't reach the server, so we don't know if the cancellation went through. Trying again is safe: it will not cancel twice or refund twice. Please try again.",
  COULD_NOT_REACH_SERVER_CHANGE_UNKNOWN:
    "We couldn't reach the server, so we don't know if the change went through. Trying again is safe: it will not change your dates twice. Please try again.",
  COULD_NOT_REACH_SERVER_PAYMENT_UNKNOWN:
    "We couldn't reach the server. Trying again is safe: it will not take the payment twice. Please try again.",
  COULD_NOT_REACH_SERVER_SAVE_UNKNOWN:
    "We couldn't reach the server, so we don't know if your changes were saved. Trying again is safe. Please try again.",
  COULD_NOT_REACH_SERVER_UNKNOWN_OUTCOME:
    "We couldn't reach the server, so we don't know if that went through. Please try again.",
  COULD_NOT_RECHECK_AVAILABILITY:
    "We couldn't re-check availability. Please try again.",
  COULD_NOT_REFRESH_BOOKING:
    "We couldn't refresh your booking. Please try again.",
  COULD_NOT_SAVE_CHANGES: 'We could not save your changes. Please try again.',
  COULD_NOT_UPDATE_PRICE: "We couldn't update your price. Please try again.",
  COULD_NOT_UPLOAD_RECEIPT: "We couldn't upload the receipt. Please try again.",
  COULD_NOT_VERIFY_BOOKING:
    "We couldn't verify that booking. Please try again.",
  COULD_NOT_WORK_OUT_REFUND:
    "We couldn't work out your refund. Please try again.",
  EMAIL_REQUIRED_FOR_ONLINE_PAYMENT:
    'Add an email address before paying online.',
  FILE_TOO_LARGE: 'That file is too large. Choose one under 10 MB.',
  FIVE_MINUTES_LEFT: 'Five minutes left on your hold.',
  HOLD_ENDED_ROOM: 'The hold on your room has ended.',
  HOLD_ENDED_UNCHANGED:
    'The hold on your new dates has ended. Your current dates are unchanged.',
  HOLD_EXPIRED: 'The hold on this room has ended.',
  HOLD_EXPIRED_ROOM: 'Your hold on this room has expired.',
  HOLD_EXPIRED_TITLE: 'Your hold on this room has expired',
  INVALID_EVENT: "We couldn't process that payment update.",
  INVALID_PAYMENT_REQUEST:
    "We couldn't start that payment. Check your details and try again.",
  INVALID_SIGNATURE: "We couldn't verify that payment. Please try again.",
  NOTHING_TO_PAY_ONLINE: "There's nothing to pay online for this reservation.",
  ONLINE_PAYMENTS_UNAVAILABLE: "Online payments aren't available right now.",
  PAYMENTS_NOT_CONFIGURED:
    "Payments aren't available right now. Please try again later.",
  PAYMENT_PROVIDER_UNREACHABLE:
    "We couldn't reach the payment provider. Try again.",
  PROOF_EMPTY: 'That file is empty. Choose another.',
  PROOF_TOO_LARGE: (maxMb: number) =>
    `The file is too large. Keep it under ${maxMb} MB.`,
  PROOF_TYPE_INVALID: 'Upload a JPG, PNG, WebP or PDF file.',
  QUOTE_CHANGED_REVIEW:
    'The price or availability changed while you were deciding. Check the new details before you continue.',
  RECEIPT_STORAGE_FAILED: "We couldn't store the receipt. Please try again.",
  RECEIPT_UPLOADS_UNAVAILABLE:
    'Receipt uploads are temporarily unavailable. Please email it to us.',
  REFUND_AMOUNT_CHANGED_REVIEW:
    'The refund amount changed while you were reviewing it. Check the new amount before you continue.',
  RESERVATION_ALREADY_PROCESSING:
    'This reservation is already being processed.',
  SESSION_ENDED_VERIFY_CONTINUE:
    'Your session ended. Verify again to continue. Nothing you entered here is lost.',
  SESSION_ENDED_VERIFY_CONTINUE_DATES:
    'Your session ended. Verify again to continue. The dates you picked are kept.',
  SESSION_ENDED_VERIFY_SAVE:
    'Your session ended. Verify again to save. What you typed is kept.',
  TWO_MINUTES_LEFT: 'Two minutes left on your hold.',
  WEBHOOK_FAILED: "We couldn't process that payment update. Please try again.",
  WEBHOOK_PROCESSING_FAILED:
    "We couldn't process that payment update. Please try again.",

  // Managing a booking
  CANNOT_CANCEL_ONLINE: 'This booking cannot be cancelled online.',
  CHANGE_AWAITING_VERIFICATION:
    'This change is already waiting for verification.',
  CHANGE_NOT_AWAITING_TRANSFER:
    'This date change is not waiting for a transfer.',
  CSRF_FAILED:
    'This request could not be verified. Reload the page and try again.',
  MANAGE_RATE_LIMITED: 'Too many requests. Please wait a moment.',
  NO_PENDING_DATE_CHANGE: 'There is no date change waiting for payment.',
  REFUND_PREVIEW_CHANGED: 'The refund amount has changed. Please review it.',
  RESERVATION_NOT_AWAITING_TRANSFER:
    "This reservation isn't waiting for a transfer.",
  SECURITY_SESSION_ENDED:
    'Your session ended for security. Look up your booking again to continue.',
  SIGNED_OUT_BOOKING: "You've signed out of this booking.",
  SIGN_OUT_TO_END_SESSION: 'Use Sign out to end this session.',

  // Contact and enquiries
  CONSENT_REQUIRED: 'Agree to the Privacy Policy so we can reply to you.',
  CONTACT_RATE_LIMITED:
    'Please wait a few minutes before sending another message.',
  COULD_NOT_SEND_EMAIL: "We couldn't send the email. Please try again.",
  COULD_NOT_SEND_ENQUIRY: "We couldn't send your enquiry. Please try again.",
  COULD_NOT_SEND_MESSAGE: "We couldn't send your message. Please try again.",
  ENQUIRY_MESSAGE_TOO_LONG: (max: number) =>
    `Keep your message under ${max.toLocaleString('en-NG')} characters.`,
  ENQUIRY_MESSAGE_TOO_SHORT: 'Tell us a little more, at least 10 characters.',
  ENQUIRY_NOT_SENT: "Your enquiry wasn't sent.",
  ENQUIRY_RATE_LIMITED:
    'Please wait a few minutes before sending another enquiry.',
  MESSAGE_NOT_SENT: "Your message wasn't sent.",
  RATE_LIMITED_ENQUIRY:
    'You have sent a few messages already. Please wait a few minutes, or message us on WhatsApp.',
  SUBJECT_TOO_LONG: 'Keep the subject under 120 characters.',
  TOPIC_REQUIRED: 'Choose what your message is about.',

  // Guest forms and details
  ADULTS_INVALID: 'Enter the number of adults as a whole number.',
  ADULT_REQUIRED: 'Add at least one adult.',
  ARRIVAL_REQUIRED: 'Choose roughly when you will arrive.',
  AT_LEAST_ONE_ADULT_REQUIRED: 'Add at least one adult to the booking.',
  AT_LEAST_ONE_ADULT_REQUIRED_SHORT: 'Add at least one adult.',
  CHECKIN_REQUIRED: 'Choose your check-in date.',
  CHECKOUT_REQUIRED: 'Choose your check-out date.',
  CHILDREN_INVALID: 'Enter the number of children as a whole number.',
  COUNTRY_REQUIRED: 'Choose your country.',
  DATE_FORMAT_REQUIRED: 'Enter a valid date in YYYY-MM-DD format.',
  DATE_FORMAT_YYYY_MM_DD: 'Enter the date as YYYY-MM-DD.',
  EMAIL_INVALID: 'Enter a valid email address, like name@example.com.',
  EMAIL_REQUIRED: 'Enter your email address.',
  END_DATE_AFTER_START: 'The end date must be after the start date.',
  FIRST_LAST_NAME_REQUIRED: 'Enter your first and last name.',
  FULL_NAME_REQUIRED: 'Enter your full name.',
  GUESTS_INVALID: 'Enter the number of guests as a whole number.',
  GUEST_REQUIRED: 'Add at least one guest.',
  INVALID_CHECKIN_DATE: 'Choose a valid check-in date.',
  INVALID_CHECKOUT_DATE: 'Choose a valid check-out date.',
  INVALID_DATE: 'Choose a valid date.',
  INVALID_END_DATE_FORMAT: 'Choose a valid end date.',
  INVALID_NIGERIAN_PHONE:
    "Enter a valid phone number, including the country code if it isn't a Nigerian number.",
  INVALID_PHONE:
    "Enter a valid phone number. Include the country code if it isn't from your selected country.",
  INVALID_START_DATE_FORMAT: 'Choose a valid start date.',
  NAME_REQUIRED: 'Enter your name.',
  NAME_TOO_LONG: 'Keep your name under 100 characters.',
  NOTES_TOO_LONG: 'Keep notes under 1,000 characters.',
  PHONE_REQUIRED: 'Enter a phone number we can reach you on WhatsApp.',
  PHONE_TOO_LONG: 'That phone number is too long.',
  REQUESTS_TOO_LONG: (max: number) =>
    `Keep requests under ${max.toLocaleString('en-NG')} characters.`,
  SELECT_AT_LEAST_ONE_ROOM: 'Select at least one room.',
  SELECT_AT_LEAST_ONE_ROOM_PLEASE: 'Please select at least one room.',
  TERMS_ACCEPTANCE_REQUIRED:
    'Accept the Terms, Privacy Policy, and Cancellation Policy to continue.',
  VALID_DATE_REQUIRED: 'Choose a valid date.',

  // Admin sign-in and security
  ADMIN_ACCOUNT_LOCKED:
    'Too many failed attempts. Try again when the countdown ends.',
  ADMIN_AUDIT_FAILED: "We couldn't save the audit entry. Please try again.",
  ADMIN_CSRF_FAILED:
    "We couldn't verify that request. Reload the page and try again.",
  ADMIN_CURRENT_PASSWORD_INVALID: 'Your current password is incorrect.',
  ADMIN_EMAIL_TOO_LONG: 'Keep the email address under 255 characters.',
  ADMIN_FORBIDDEN: "You don't have permission to view that page.",
  ADMIN_INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ADMIN_MFA_ALREADY_ENABLED:
    'Two-factor authentication is already on. Turn it off first to set it up again.',
  ADMIN_MFA_EXPIRED: 'Your sign-in attempt expired. Start again.',
  ADMIN_MFA_INVALID: 'That code is not valid. Try again.',
  ADMIN_MFA_NOT_ENABLED: "Two-factor authentication isn't enabled.",
  ADMIN_MFA_SETUP_REQUIRED:
    'Owners must set up two-factor authentication before continuing.',
  ADMIN_NAME_REQUIRED: 'Enter a first and last name.',
  ADMIN_NAME_TOO_LONG: 'Keep names under 100 characters.',
  ADMIN_OWNER_MFA_CANNOT_DISABLE:
    'Owners must keep two-factor authentication on.',
  ADMIN_PASSWORD_MISMATCH: "The passwords don't match.",
  ADMIN_PASSWORD_TOO_COMMON:
    'That password is too common. Choose something less predictable.',
  ADMIN_PASSWORD_TOO_LONG: 'Keep your password under 200 characters.',
  ADMIN_PASSWORD_TOO_SHORT: 'Use at least 10 characters for your password.',
  ADMIN_PASSWORD_UNCHANGED: "Choose a password you haven't used here before.",
  ADMIN_PHONE_TOO_LONG: 'Keep the phone number under 30 characters.',
  ADMIN_RESET_INVALID: 'This reset link is invalid or has expired.',
  ADMIN_SESSION_EXPIRED: 'Your session expired. Sign in again to continue.',
  ADMIN_STEP_UP_REQUIRED:
    'For your security, enter your password or 2FA code to continue.',
  COULD_NOT_CHANGE_PASSWORD: "We couldn't change your password. Try again.",
  COULD_NOT_COMPLETE_ACTION: "We couldn't complete that action. Try again.",
  COULD_NOT_CONFIRM_CODE: "We couldn't confirm the code. Try again.",
  COULD_NOT_COPY_CODES:
    "We couldn't copy automatically. Save each code manually.",
  COULD_NOT_LOAD_SESSIONS: "We couldn't load your sessions. Please try again.",
  COULD_NOT_RESET_PASSWORD: "We couldn't reset your password. Try again.",
  COULD_NOT_SAVE_PROFILE: "We couldn't save your profile. Try again.",
  COULD_NOT_SEND_REQUEST: "We couldn't send the request. Try again.",
  COULD_NOT_SIGN_IN:
    "We couldn't sign in. Check your connection and try again.",
  COULD_NOT_SIGN_OUT_SESSION:
    "We couldn't sign out that session. Please try again.",
  COULD_NOT_START_2FA_SETUP: "We couldn't start setup. Try again.",
  COULD_NOT_VERIFY_CODE: "We couldn't verify that code. Try again.",
  MFA_ENCRYPTION_KEY_MISSING:
    'Two-factor authentication is temporarily unavailable. Please try again later.',
  MFA_SECRET_INVALID:
    "We couldn't set up two-factor authentication. Please start again.",
  PASSWORD_REQUIRED: 'Enter your password.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  STEP_UP_CREDENTIALS_REQUIRED: 'Enter your password or 2FA code to continue.',
  VERIFICATION_FAILED: "We couldn't verify those details.",
  VERIFICATION_FAILED_CREDENTIALS:
    'Verification failed. Check your password or 2FA code and try again.',

  // Staff, roles and permissions
  AUDIT_ENTRY_NOT_FOUND:
    "We couldn't find that audit entry, or you don't have access to it.",
  CANNOT_CHANGE_OWN_ROLE:
    "You can't change your own role. Ask another owner, or update your account from your profile page.",
  CANNOT_DEACTIVATE_LAST_OWNER:
    "You can't deactivate the last active owner. There must always be at least one active owner.",
  CANNOT_DEACTIVATE_SELF: "You can't deactivate your own account.",
  CANNOT_DEMOTE_LAST_OWNER:
    "You can't demote the last active owner. Promote another active staff member to owner first.",
  CANNOT_RESET_MFA_LAST_OWNER:
    "You can't reset 2FA for the only active owner. Add another active owner first.",
  EMAIL_ALREADY_IN_USE: 'That email is already in use by another staff member.',
  EXPORT_RATE_LIMITED:
    "You've exported too many times. Please wait a minute and try again.",
  FAILED_CREATE_STAFF_INVITATION: "We couldn't create staff invitation.",
  FAILED_TO_DEACTIVATE_STAFF:
    "We couldn't deactivate staff member. Please try again.",
  FAILED_TO_INVITE_STAFF: "We couldn't invite staff member. Please try again.",
  FAILED_TO_LOAD_AUDIT_LOGS: "We couldn't load audit logs. Please try again.",
  FAILED_TO_LOAD_STAFF_MEMBERS:
    "We couldn't load staff members. Please try again.",
  FAILED_TO_REACTIVATE_STAFF:
    "We couldn't reactivate staff member. Please try again.",
  FAILED_TO_RESEND_INVITATION:
    "We couldn't resend invitation. Please try again.",
  FAILED_TO_RESET_2FA: "We couldn't reset 2FA. Please try again.",
  FAILED_TO_SEND_INVITATION: "We couldn't send invitation. Please try again.",
  FAILED_TO_UPDATE_STAFF: "We couldn't update staff member. Please try again.",
  FAILED_TO_UPDATE_STAFF_PROFILE: "We couldn't update. Please try again.",
  MANAGERS_ONLY_BACKDATE:
    'Only managers and owners can change a room block to start in the past.',
  MANAGERS_ONLY_BACKDATED_BLOCKS:
    'Only managers and owners can create room blocks that start in the past.',
  MANAGERS_ONLY_BLOCK_REASON: (reason: string) =>
    `Only managers and owners can choose the "${reason}" block reason.`,
  MANAGERS_ONLY_CREATE_BACKDATE:
    'Only managers and owners can create a room block that starts in the past.',
  MANAGERS_ONLY_CREATE_BLOCK_REASON: (reason: string) =>
    `Only managers and owners can create a block with the "${reason}" reason.`,
  MANAGERS_ONLY_PAST_CHECKIN:
    'Only managers and owners can create reservations with a past check-in date.',
  MANAGERS_ONLY_SET_BLOCK_REASON: (reason: string) =>
    `Only managers and owners can set the block reason to "${reason}".`,
  ONLY_MANAGERS_APPROVE: 'Only managers and owners can approve reservations.',
  ONLY_MANAGERS_CANCEL: 'Only managers and owners can cancel reservations.',
  ONLY_MANAGERS_CHANGE_DATES: 'Only managers and owners can change dates.',
  ONLY_MANAGERS_DECLINE: 'Only managers and owners can decline reservations.',
  ONLY_MANAGERS_ISSUE_REFUNDS: 'Only managers and owners can issue refunds.',
  ONLY_MANAGERS_RECORD_PAYMENTS:
    'Only managers and owners can record payments.',
  ONLY_PENDING_CONFIRMED_RESERVATIONS_CANCEL:
    'Only pending or confirmed reservations can be cancelled.',
  OWNERS_ONLY_AUDIT_EXPORT: 'Only owners can export audit logs.',
  OWNERS_ONLY_UNRECONCILE: 'Only owners can unreconcile payments.',
  OWNERS_ONLY_UNRECONCILE_BARE: 'Only owners can unreconcile payments.',
  RECEPTION_CANNOT_DISCOUNT: "Reception staff can't apply discounts.",
  STAFF_MEMBER_NOT_FOUND: "We couldn't find that staff member.",
  STAFF_USER_NOT_FOUND: "We couldn't find that staff account.",

  // Room types, rooms and media
  AMENITY_NOT_FOUND: "We couldn't find that amenity.",
  EXTRA_HAS_BOOKINGS:
    "This extra has been booked before, so it can't be deleted. Deactivate it instead so it's no longer offered.",
  EXTRA_NOT_FOUND: "We couldn't find that extra.",
  FAILED_TO_CHECK_RATE_OVERLAP:
    "We couldn't check rate overlap. Please try again.",
  FAILED_TO_CREATE_AMENITY: "We couldn't create amenity. Please try again.",
  FAILED_TO_CREATE_EXTRA: "We couldn't create extra. Please try again.",
  FAILED_TO_CREATE_RATE_RULE: "We couldn't create rate rule. Please try again.",
  FAILED_TO_CREATE_ROOM_TYPE: "We couldn't create room type. Please try again.",
  FAILED_TO_CREATE_ROOM_UNIT: "We couldn't create room unit. Please try again.",
  FAILED_TO_DELETE_AMENITY: "We couldn't delete amenity. Please try again.",
  FAILED_TO_DELETE_EXTRA: "We couldn't delete extra. Please try again.",
  FAILED_TO_DELETE_IMAGE: "We couldn't delete image. Please try again.",
  FAILED_TO_DELETE_PHOTO: "We couldn't delete photo. Please try again.",
  FAILED_TO_DELETE_RATE_RULE: "We couldn't delete rate rule. Please try again.",
  FAILED_TO_DELETE_ROOM_TYPE: "We couldn't delete room type. Please try again.",
  FAILED_TO_DELETE_ROOM_UI: "We couldn't delete room. Please try again.",
  FAILED_TO_GET_ROOM_TYPE: "We couldn't get room type. Please try again.",
  FAILED_TO_LIST_AMENITIES: "We couldn't list amenities. Please try again.",
  FAILED_TO_LIST_EXTRAS: "We couldn't list extras. Please try again.",
  FAILED_TO_LIST_RATE_RULES: "We couldn't list rate rules. Please try again.",
  FAILED_TO_LIST_ROOM_TYPES: "We couldn't list room types. Please try again.",
  FAILED_TO_LOAD_14_DAY_OCCUPANCY:
    "We couldn't load 14-day occupancy data. Please try again.",
  FAILED_TO_LOAD_AMENITIES_CATALOG:
    "We couldn't load amenities catalog. Please try again.",
  FAILED_TO_LOAD_AVAILABLE_ROOMS:
    "We couldn't load available rooms. Please try again.",
  FAILED_TO_LOAD_RATE_RULES_UI:
    "We couldn't load rate rules. Please try again.",
  FAILED_TO_LOAD_ROOM_BLOCKS: "We couldn't load room blocks. Please try again.",
  FAILED_TO_RELOAD_AMENITIES: "We couldn't reload amenities. Please try again.",
  FAILED_TO_RELOAD_EXTRAS: "We couldn't reload extras. Please try again.",
  FAILED_TO_RELOAD_ROOM_TYPES:
    "We couldn't reload room types. Please try again.",
  FAILED_TO_REORDER_AMENITIES:
    "We couldn't reorder amenities. Please try again.",
  FAILED_TO_REORDER_EXTRAS: "We couldn't reorder extras. Please try again.",
  FAILED_TO_REORDER_PHOTOS: "We couldn't reorder photos. Please try again.",
  FAILED_TO_REORDER_ROOM_TYPES:
    "We couldn't reorder room types. Please try again.",
  FAILED_TO_SAVE_AMENITIES: "We couldn't save amenities. Please try again.",
  FAILED_TO_SAVE_AMENITY: "We couldn't save amenity. Please try again.",
  FAILED_TO_SAVE_EXTRA: "We couldn't save extra. Please try again.",
  FAILED_TO_SAVE_RATE_RULE: "We couldn't save rate rule. Please try again.",
  FAILED_TO_SAVE_ROOM_BLOCK: "We couldn't save room block. Please try again.",
  FAILED_TO_SAVE_ROOM_UNIT: "We couldn't save room unit. Please try again.",
  FAILED_TO_SET_COVER_PHOTO: "We couldn't set cover photo. Please try again.",
  FAILED_TO_UPDATE_AMENITIES: "We couldn't update amenities. Please try again.",
  FAILED_TO_UPDATE_AMENITY: "We couldn't update amenity. Please try again.",
  FAILED_TO_UPDATE_EXTRA: "We couldn't update extra. Please try again.",
  FAILED_TO_UPDATE_IMAGE: "We couldn't update image. Please try again.",
  FAILED_TO_UPDATE_PHOTO_DETAILS:
    "We couldn't update photo details. Please try again.",
  FAILED_TO_UPDATE_RATE_RULE: "We couldn't update rate rule. Please try again.",
  FAILED_TO_UPDATE_ROOM: "We couldn't update room. Please try again.",
  FAILED_TO_UPDATE_ROOM_TYPE: "We couldn't update room type. Please try again.",
  FAILED_TO_UPDATE_SORT_ORDER:
    "We couldn't save the new order. Refresh the page and try again.",
  FAILED_TO_UPLOAD_PHOTO: "We couldn't upload photo. Please try again.",
  IMAGE_DIMENSIONS_BELOW_MIN: (
    width: number,
    height: number,
    minWidth: number,
    minHeight: number,
  ) =>
    `This image is ${width}x${height} pixels. Use at least ${minWidth}x${minHeight} pixels.`,
  IMAGE_DIMENSIONS_UNREADABLE:
    "We couldn't read that image. Try uploading it again.",
  IMAGE_FILE_REQUIRED: 'Choose an image to upload.',
  IMAGE_FORMAT_UNSUPPORTED: 'Choose a JPEG, PNG, or WebP image.',
  IMAGE_INVALID: "That image can't be used. Choose a different file.",
  IMAGE_NOT_FOUND: "We couldn't find that image.",
  IMAGE_TOO_LARGE: 'That image is too large. Choose one under 10 MB.',
  IMAGE_TOO_SMALL: 'That file is empty or too small. Choose another image.',
  RATE_RULE_NOT_FOUND: "We couldn't find that rate rule.",
  ROOM_HAS_RESERVATIONS:
    "This room has past or upcoming reservations, so it can't be deleted. Set it to inactive instead.",
  ROOM_NUMBER_EXISTS: (roomNumber: string) =>
    `Room ${roomNumber} already exists. Choose a different room number.`,
  ROOM_NUMBER_IN_USE: (roomNumber: string) =>
    `Room ${roomNumber} is already in use. Choose a different room number.`,
  ROOM_STATUS_CHANGE_BLOCKED: (
    status: string,
    reservations: number,
    blocks: number,
  ) =>
    `This room can't be set to "${status}" yet. It has ${reservations} upcoming reservation${reservations === 1 ? '' : 's'} and ${blocks} active block${blocks === 1 ? '' : 's'}. Reassign or remove them first.`,
  ROOM_TYPE_ALT_TEXT_REQUIRED:
    'Add alt text to every photo before publishing this room type.',
  ROOM_TYPE_HAS_BOOKINGS:
    "This room type has booking history, so it can't be deleted. Deactivate it instead to hide it from guests.",
  ROOM_TYPE_INACTIVE: "That room type doesn't exist or is inactive.",
  ROOM_TYPE_MAX_PHOTOS: 'You can add up to 8 photos.',
  ROOM_TYPE_NOT_FOUND: "We couldn't find that room type.",
  ROOM_TYPE_SLUG_EXISTS: (slug: string) =>
    `A room type with the slug "${slug}" already exists. Choose a different slug.`,
  ROOM_TYPE_SLUG_IN_USE: (slug: string) =>
    `The slug "${slug}" is already used by another room type. Choose a different slug.`,
  ROOM_TYPE_SLUG_LOCKED:
    'Changing the slug of a live room type breaks public links. Confirm the slug unlock to continue.',

  // Amenities, extras and rate rules
  AMENITY_ASSIGNED_ROOM_TYPES: (names: string) =>
    `This amenity is used by: ${names}. Remove it from those room types before deleting it.`,
  AMENITY_KEY_EXISTS: (key: string) =>
    `An amenity with the key "${key}" already exists. Choose a different key.`,
  AMENITY_KEY_IN_USE: (key: string) =>
    `The key "${key}" is already used by another amenity. Choose a different key.`,
  CANNOT_DELETE_ASSIGNED_AMENITY: (label: string, count: number) =>
    `"${label}" is used by ${count} room type${count === 1 ? '' : 's'}. Remove it from them before deleting it.`,
  EXTRA_SLUG_EXISTS: (slug: string) =>
    `An extra with the slug "${slug}" already exists. Choose a different slug.`,
  EXTRA_SLUG_IN_USE: (slug: string) =>
    `The slug "${slug}" is already used by another extra. Choose a different slug.`,

  // Room blocks and calendar
  BLOCK_VERSION_CONFLICT:
    'This room block was modified by another user. Please refresh and try again.',
  FAILED_TO_CHECK_BLOCK_CONFLICTS:
    "We couldn't check block conflicts. Please try again.",
  FAILED_TO_CHECK_ROOM_IMPACT:
    "We couldn't check room impact. Please try again.",
  FAILED_TO_CREATE_BLOCK: "We couldn't create room block. Please try again.",
  FAILED_TO_DELETE_BLOCK: "We couldn't delete room block. Please try again.",
  FAILED_TO_GET_PRICE_CALENDAR:
    "We couldn't get price calendar. Please try again.",
  FAILED_TO_LIST_BLOCKS: "We couldn't list room blocks. Please try again.",
  FAILED_TO_LOAD_CALENDAR: "We couldn't load calendar data. Please try again.",
  FAILED_TO_LOAD_DASHBOARD_SUMMARY:
    "We couldn't load dashboard summary. Please try again.",
  FAILED_TO_LOAD_DAY_DATA: "We couldn't load day data. Please try again.",
  FAILED_TO_LOAD_DAY_DETAILS: "We couldn't load day details. Please try again.",
  FAILED_TO_LOAD_OCCUPANCY:
    "We couldn't load occupancy data. Please try again.",
  FAILED_TO_LOAD_OCCUPANCY_UI: "We couldn't load occupancy. Please try again.",
  FAILED_TO_LOAD_REVENUE: "We couldn't load revenue data. Please try again.",
  FAILED_TO_LOAD_REVENUE_UI: "We couldn't load revenue. Please try again.",
  FAILED_TO_LOAD_SUMMARY: "We couldn't load summary. Please try again.",
  FAILED_TO_QUERY_AVAILABILITY:
    "We couldn't query room availability. Please try again.",
  FAILED_TO_REFRESH_CALENDAR:
    "We couldn't refresh calendar data. Please try again.",
  FAILED_TO_UPDATE_BLOCK: "We couldn't update room block. Please try again.",
  ROOMS_HAVE_CONFLICTS: 'Some rooms overlap with other reservations or blocks.',
  ROOM_BLOCK_CREATE_CONFLICT:
    'This block overlaps another reservation or block. Choose different dates or rooms.',
  ROOM_BLOCK_NOT_FOUND: "We couldn't find that room block.",
  ROOM_BLOCK_UPDATE_CONFLICT:
    'This change overlaps another reservation or block. Choose different dates or rooms.',
  SCHEDULING_CONFLICT:
    'That change conflicts with another reservation or block.',

  // Reservations and guest lifecycle
  ALREADY_CHECKED_IN_EARLY_LEAVE:
    "You've already checked in. Please speak to reception if you need to leave early.",
  BOOKING_ALREADY_CANCELLED: 'This booking is already cancelled.',
  BOOKING_EXPIRED_CANNOT_CANCEL:
    "This booking expired because it wasn't paid in time, so there's nothing to cancel.",
  CANNOT_CANCEL_CHECKED_IN:
    "Checked-in stays can't be cancelled online. They must be completed through check-out.",
  CANNOT_CHANGE_DATES_ONLINE_STATUS:
    "Dates can't be changed online for a booking in this status.",
  CANNOT_CHANGE_DATES_PAST:
    "You can't change dates after the check-in date has passed.",
  CANNOT_CHANGE_DATES_PAYMENT_PENDING:
    "Dates can't be changed while a payment is waiting to be confirmed.",
  CANNOT_CHANGE_DATES_STATUS:
    'Stay dates can only be changed for pending or confirmed bookings.',
  CANNOT_CHECK_IN_STATUS: (_status: string) =>
    "This reservation can't be checked in yet. Confirm it first.",
  CANNOT_CHECK_OUT_STATUS: (_status: string) =>
    "This reservation can't be checked out yet. The guest must be checked in first.",
  CANNOT_EDIT_INACTIVE_BOOKING: "You can't edit cancelled or expired bookings.",
  CANNOT_RECORD_PAYMENT_CANCELLED:
    "You can't record payments for cancelled or expired bookings.",
  CHECKED_IN_MUST_CHECKOUT:
    'Checked-in stays must be completed through check-out.',
  CHECKIN_FAILED: "We couldn't check the guest in.",
  CHECKIN_ON_OR_AFTER_ARRIVAL:
    'Guests can only check in on or after the arrival date.',
  CHECKIN_PASSED: 'The check-in date has already passed.',
  CHECKIN_REQUIRES_CONFIRMATION:
    'The reservation must be confirmed before check-in.',
  CHECKOUT_FAILED: "We couldn't check the guest out.",
  CHECKOUT_REQUIRES_CHECKIN: 'The guest must be checked in before check-out.',
  CONFIRMATION_BLOCKED_APPROVAL:
    "Confirmation can't be sent while the hotel is still reviewing the booking.",
  CONFIRMATION_EXPIRED_HOLD:
    "Confirmation can't be resent for an expired hold.",
  DETAILS_CANNOT_EDIT: "These details can't be edited.",
  DETAILS_CANNOT_EDIT_STATUS:
    "Details can't be edited for a booking in this status.",
  EXTRAS_CANNOT_ADD_STATUS:
    "Extras can't be added to a booking in this status.",
  FAILED_TO_APPROVE_BOOKING: "We couldn't approve booking. Please try again.",
  FAILED_TO_CALCULATE_QUOTE_PERIOD:
    "We couldn't calculate quote. Please try again.",
  FAILED_TO_CANCEL_RESERVATION:
    "We couldn't cancel reservation. Please try again.",
  FAILED_TO_CANCEL_RESERVATION_UI:
    "We couldn't cancel reservation. Please try again.",
  FAILED_TO_CHANGE_DATES:
    "We couldn't change reservation dates. Please try again.",
  FAILED_TO_CHANGE_DATES_UI: "We couldn't change dates. Please try again.",
  FAILED_TO_CHECK_IN: "We couldn't check in reservation. Please try again.",
  FAILED_TO_CHECK_IN_WITH_REASON: (reason: string) =>
    `We couldn't check the guest in: ${reason}`,
  FAILED_TO_CHECK_OUT: "We couldn't check out reservation. Please try again.",
  FAILED_TO_CHECK_OUT_WITH_REASON: (reason: string) =>
    `We couldn't check the guest out: ${reason}`,
  FAILED_TO_COMPLETE_ACTION: 'Action failed. Please try again.',
  FAILED_TO_CREATE_RESERVATION:
    "We couldn't create reservation. Please try again.",
  FAILED_TO_CREATE_RESERVATION_UI:
    "We couldn't create reservation. Please try again.",
  FAILED_TO_DECLINE_BOOKING: "We couldn't decline booking. Please try again.",
  FAILED_TO_EXPORT: 'Export failed. Please try again.',
  FAILED_TO_EXPORT_OR_RATE_LIMITED:
    'Export failed or rate limited. Please try again.',
  FAILED_TO_GENERATE_CSV: "We couldn't generate CSV export. Please try again.",
  FAILED_TO_GET_NEIGHBORS:
    "We couldn't get neighboring reservations. Please try again.",
  FAILED_TO_ISSUE_REFUND: "We couldn't issue refund. Please try again.",
  FAILED_TO_ISSUE_REFUND_UI: "We couldn't issue refund. Please try again.",
  FAILED_TO_LOAD_BOOKING: "We couldn't load booking. Please try again.",
  FAILED_TO_LOAD_RESERVATIONS:
    "We couldn't load reservations. Please try again.",
  FAILED_TO_LOAD_RESERVATIONS_UI:
    "We couldn't load reservations. Please try again.",
  FAILED_TO_LOAD_RESERVATION_DETAIL:
    "We couldn't load reservation detail. Please try again.",
  FAILED_TO_LOG_AUDIT: "We couldn't log audit entry. Please try again.",
  FAILED_TO_MARK_NO_SHOW: "We couldn't mark as no-show. Please try again.",
  FAILED_TO_MARK_NO_SHOW_UI: "We couldn't mark as no-show. Please try again.",
  FAILED_TO_PREVIEW_CANCELLATION:
    "We couldn't preview cancellation. Please try again.",
  FAILED_TO_PROCESS_APPROVAL:
    "We couldn't process approval action. Please try again.",
  FAILED_TO_PROCESS_TRANSFER:
    "We couldn't process bank transfer. Please try again.",
  FAILED_TO_QUOTE_DATES: "We couldn't quote stay dates. Please try again.",
  FAILED_TO_QUOTE_STAY_CHANGE:
    "We couldn't quote stay change. Please try again.",
  FAILED_TO_REASSIGN_ROOM: "We couldn't reassign room. Please try again.",
  FAILED_TO_REASSIGN_ROOM_UI: "We couldn't reassign room. Please try again.",
  FAILED_TO_RECORD_PAYMENT: "We couldn't record payment. Please try again.",
  FAILED_TO_RECORD_PAYMENT_UI: "We couldn't record payment. Please try again.",
  FAILED_TO_REJECT_TRANSFER: "We couldn't reject transfer. Please try again.",
  FAILED_TO_RESEND_CONFIRMATION:
    "We couldn't resend confirmation email. Please try again.",
  FAILED_TO_RESEND_NOTIFICATION:
    "We couldn't resend notification. Please try again.",
  FAILED_TO_UPDATE_DETAILS: "We couldn't update details. Please try again.",
  FAILED_TO_UPDATE_DETAILS_UI: "We couldn't update details. Please try again.",
  FAILED_TO_VERIFY_TRANSFER: "We couldn't verify transfer. Please try again.",
  GUEST_ALREADY_CHECKED_IN: 'The guest is already checked in.',
  NO_ROOMS_SELECTED_DATES:
    'No rooms are available for those dates and room type.',
  NO_SHOW_ON_OR_AFTER_ARRIVAL:
    'A no-show can only be marked on or after the arrival date.',
  NO_SHOW_TOO_EARLY:
    "A no-show can't be marked before the arrival date has begun.",
  ONLY_CONFIRMED_NO_SHOW: 'Only confirmed bookings can be marked as a no-show.',
  ONLY_CONFIRMED_RESERVATIONS_NO_SHOW:
    'Only confirmed reservations can be marked as no-show.',
  ONLY_PENDING_APPROVAL:
    'Only pending reservations in manual approval mode can be approved or declined.',
  ONLY_PENDING_CONFIRMED_CANCEL:
    'Only pending or confirmed bookings can be cancelled.',
  PAYMENT_RECORD_NOT_FOUND: "We couldn't find that payment record.",
  PRICING_QUOTE_CALCULATION_FAILED: (_status: string) =>
    "We couldn't calculate the price. Please try again.",
  PRICING_QUOTE_ERROR: (_status: string) =>
    "We couldn't calculate the price for those dates. Please try again.",
  QUOTE_EXPIRED: 'That quote has expired. Choose your dates again.',
  QUOTE_NEW_STAY_FAILED: (_status: string) =>
    "We couldn't price the new dates. Please try again.",
  REFUND_EXCEEDS_BALANCE: 'The refund is more than the net payment balance.',
  REFUND_ONLY_PAID_PAYMENTS:
    'Refunds can only be issued against paid payments.',
  RESERVATION_COMPLETED_OR_CANCELLED:
    'This reservation is already completed or cancelled.',
  RESERVATION_FULLY_PAID: 'This reservation is already fully paid.',
  RESERVATION_NOT_AWAITING_APPROVAL:
    "This reservation isn't waiting for approval.",
  RESERVATION_VERSION_CONFLICT:
    'This reservation was changed somewhere else. Reload the page and review the latest details.',
  ROOM_ALREADY_RESERVED: 'That room is already reserved for these dates.',
  ROOM_BLOCKED_FOR_DATES:
    'That room is blocked for maintenance or a hotel hold during these dates.',
  ROOM_NOT_AVAILABLE_NEW_DATES:
    "That room isn't available for the new dates. Choose another room.",
  ROOM_REASSIGN_INACTIVE: 'Rooms can only be reassigned on active bookings.',
  ROOM_REASSIGN_NOT_FOUND: "That room doesn't exist or is inactive.",
  ROOM_REASSIGN_TYPE_MISMATCH: 'Choose a room of the same room type.',
  SELECTED_ROOM_NOT_AVAILABLE:
    "That room isn't available for the requested dates.",

  // Payments, refunds and reconciliation
  AMOUNT_EXCEEDS_BALANCE: (balance: string) =>
    `The amount can't be more than the balance due (${balance}).`,
  AMOUNT_EXCEEDS_PAYMENT_BALANCE: (balance: string) =>
    `The amount can't be more than the payment balance (${balance}).`,
  ASSOCIATED_RESERVATION_NOT_FOUND:
    "We couldn't find the reservation linked to that payment.",
  FAILED_TO_LOAD_PAYMENTS: "We couldn't load payments. Please try again.",
  FAILED_TO_PROCESS_REFUND_PAYOUT:
    "We couldn't process refund payout. Please try again.",
  FAILED_TO_RECONCILE: "We couldn't reconcile. Please try again.",
  FAILED_TO_RECORD_REFUND_PAYOUT:
    "We couldn't record refund payout. Please try again.",
  FAILED_TO_UNRECONCILE: "We couldn't unreconcile. Please try again.",
  FAILED_TO_UNRECONCILE_PAYMENT:
    "We couldn't unreconcile payment. Please try again.",
  NO_REFUNDABLE_BALANCE:
    "There's no refundable balance left on this reservation.",
  ONLY_PENDING_BANK_TRANSFERS:
    'Only pending bank transfers can be verified or rejected.',
  PAYMENT_EXCEEDS_BALANCE: (amount: string, balance: string) =>
    `The payment (₦${amount}) can't be more than the balance due (₦${balance}).`,
  PAYMENT_NOT_APPLIED: (_reference: string) =>
    "We couldn't apply that payment. Please contact us.",
  PAYMENT_NOT_FOUND: "We couldn't find that payment.",
  PAYMENT_PROVIDER_ADAPTER_MISSING: (_provider: string) =>
    "That payment method isn't available right now.",
  PAYMENT_PROVIDER_REJECTED:
    "The payment provider couldn't complete that request. Please try again.",
  PAYOUT_AMOUNT_POSITIVE: 'Payout amount must be greater than zero.',
  PAYOUT_EXCEEDS_REFUND_DUE: (amount: string, due: string) =>
    `The payout (₦${amount}) cannot exceed the refund amount due (₦${due}).`,
  PAYOUT_EXCEEDS_REFUND_DUE_SIMPLE: (due: string) =>
    `The payout can't be more than the refund due (${due}).`,
  PAYOUT_EXCEEDS_REMAINING: (amount: string) =>
    `The payout exceeds remaining un-refunded payments (₦${amount}).`,
  PAYSTACK_NOT_CONFIGURED:
    "Card payments aren't available right now. Please try again later.",
  REFUND_AMOUNT_BETWEEN: (max: string) =>
    `Enter a refund between ₦0 and ${max}.`,
  REFUND_AMOUNT_EXCEEDS_REFUNDABLE: (amount: string, refundable: string) =>
    `The refund (₦${amount}) is more than the refundable amount (₦${refundable}).`,
  REFUND_EXCEEDS_AVAILABLE_BALANCE: (amount: string, available: string) =>
    `The refund (₦${amount}) is more than the available refundable balance (₦${available}).`,
  REFUND_PAYMENT_NOT_FOUND: "We couldn't find that refund payment.",
  TARGET_PAYMENT_NOT_FOUND: "We couldn't find that payment.",
  UNKNOWN_PAYMENT_PROVIDER: "That payment method isn't available right now.",
  UNSUPPORTED_PAYMENT_PROVIDER: (_provider: string) =>
    "That payment method isn't available right now.",
  WEBHOOK_ALREADY_PROCESSED: 'This payment event has already been processed.',
  WEBHOOK_EVENT_NOT_FOUND: "We couldn't find that payment event.",

  // Validation and request details
  IDEMPOTENCY_KEY_MISSING: 'Please refresh the page and try again.',
  IDEMPOTENCY_KEY_REQUIRED: 'Please refresh the page and try again.',
  INVALID_AMENITIES_LIST: 'Choose valid amenities and try again.',
  INVALID_AMENITY_DATA: 'Check the amenity details and try again.',
  INVALID_APPROVAL_DATA: 'Check the approval details and try again.',
  INVALID_BLOCK_CHECK_PARAMETERS: 'Check the room block details and try again.',
  INVALID_BLOCK_PARAMETERS: 'Check the room block details and try again.',
  INVALID_BLOCK_UPDATE_PARAMETERS:
    'Check the room block details and try again.',
  INVALID_CALENDAR_QUERY:
    "The calendar filters aren't valid. Please adjust them and try again.",
  INVALID_CANCELLATION_DATA: 'Check the cancellation details and try again.',
  INVALID_DATE_CHANGE_PARAMETERS: 'Check the new dates and try again.',
  INVALID_DATE_FORMAT: 'Enter the date as YYYY-MM-DD.',
  INVALID_DATE_PARAMETER: 'Choose a valid date.',
  INVALID_DATE_QUOTE_REQUEST: 'Check the new dates and try again.',
  INVALID_DECLINE_DATA: 'Check the decline reason and try again.',
  INVALID_DETAILS: 'Check the details and try again.',
  INVALID_EXPORT_FILTERS:
    "Some export filters aren't valid. Please adjust them and try again.",
  INVALID_EXTRA_DATA: 'Check the extra details and try again.',
  INVALID_FILTER_PARAMETERS:
    "Some filters aren't valid. Please adjust them and try again.",
  INVALID_IMAGE_UPDATE_DATA: 'Check the image details and try again.',
  INVALID_INPUT: "Some details aren't valid. Please check them and try again.",
  INVALID_JSON_BODY: "We couldn't read that request. Please try again.",
  INVALID_JSON_REQUEST: "We couldn't read that request. Please try again.",
  INVALID_NO_SHOW_DATA: 'Check the no-show details and try again.',
  INVALID_OCCUPANCY_PARAMETERS: 'Choose a valid date range for occupancy.',
  INVALID_PARAMETERS:
    "Some request details aren't valid. Please check them and try again.",
  INVALID_PAYMENT_DATA: 'Check the payment details and try again.',
  INVALID_PAYOUT_INPUT: 'Check the payout details and try again.',
  INVALID_QUERY_PARAMETERS:
    "Some filters aren't valid. Please adjust them and try again.",
  INVALID_QUOTE_PARAMETERS: 'Check the dates and guests, then try again.',
  INVALID_QUOTE_PREVIEW_PARAMETERS:
    'Check the dates and guests, then try again.',
  INVALID_RATE_RULE_DATA: 'Check the rate rule details and try again.',
  INVALID_REFUND_REQUEST: 'Check the refund details and try again.',
  INVALID_REJECTION_PAYLOAD: 'Check the rejection details and try again.',
  INVALID_REORDER_DATA:
    "We couldn't save the new order. Refresh the page and try again.",
  INVALID_RESEND_PARAMETERS: 'Check the email address and try again.',
  INVALID_RESERVATION_DATA: 'Check the reservation details and try again.',
  INVALID_RESERVATION_QUERY_FILTERS:
    "Some reservation filters aren't valid. Please adjust them and try again.",
  INVALID_REVENUE_RANGE: 'Choose a valid date range for revenue.',
  INVALID_ROOM_DATA: 'Check the room details and try again.',
  INVALID_ROOM_ID:
    "We couldn't identify that room. Refresh the page and try again.",
  INVALID_ROOM_REASSIGNMENT: 'Choose a valid room and try again.',
  INVALID_ROOM_TYPE_DATA: 'Check the room type details and try again.',
  INVALID_ROOM_TYPE_DETAILS: 'Check the room type details and try again.',
  INVALID_ROOM_TYPE_ID:
    "We couldn't identify that room type. Refresh the page and try again.",
  INVALID_STAFF_INVITE_INPUT:
    'Check the staff invitation details and try again.',
  INVALID_STEP_UP_INPUT: 'Check your password or 2FA code and try again.',
  INVALID_VERIFICATION_PAYLOAD: 'Check the verification details and try again.',
  MISSING_AVAILABILITY_PARAMETERS: 'Choose a room type and your dates.',
  MISSING_BLOCK_ID:
    "We couldn't identify that room block. Refresh the page and try again.",
  MISSING_PAYMENT_ID:
    "We couldn't identify that payment. Refresh the page and try again.",
  MISSING_RESERVATION_ID:
    "We couldn't identify that reservation. Refresh the page and try again.",
  MISSING_RESERVATION_IDENTIFIER:
    "We couldn't identify that reservation. Refresh the page and try again.",
  MISSING_RESERVATION_ID_PERIOD:
    "We couldn't identify that reservation. Refresh the page and try again.",
  MISSING_RESERVATION_PAYMENT_ID:
    "We couldn't identify that payment. Refresh the page and try again.",
  ROOM_TYPE_ID_REQUIRED: 'Choose a room type.',
  VALID_PAYMENT_ID_REQUIRED:
    "We couldn't identify that payment. Refresh the page and try again.",
  VALID_ROOM_ID_REQUIRED:
    "We couldn't identify that room. Refresh the page and try again.",
  VERSION_REQUIRED: 'Refresh the page and try again.',
  VERSION_REQUIRED_CONCURRENCY: 'Refresh the page and try again.',
  VERSION_TOKEN_MISSING: 'Refresh the page and try again.',

  // Network and connection
  COULD_NOT_REACH_GATEWAY:
    "We couldn't check the payment gateway. Please try again.",
  COULD_NOT_REACH_SERVER: "We couldn't reach the server. Please try again.",
  COULD_NOT_REACH_SERVER_CONNECTION:
    "We couldn't reach the server. Check your connection and try again.",

  // Admin form prompts
  ACCEPT_TERMS_FOR_GUEST:
    'Accept the terms on behalf of the guest to continue.',
  ALT_TEXT_CANNOT_BE_EMPTY: 'Add alt text for this image.',
  ALT_TEXT_REQUIRED: 'Add alt text for this image.',
  ALT_TEXT_REQUIRED_FOR_ACCESSIBILITY:
    'Add alt text so everyone can understand this image.',
  ALT_TEXT_REQUIRED_PUBLISHING: 'Add alt text before publishing this image.',
  AMENITY_LABEL_REQUIRED: 'Enter a label for the amenity.',
  AMOUNT_POSITIVE: 'Enter an amount greater than zero.',
  BACKDATE_REASON_PROMPT: 'Add a reason for backdating this room block.',
  BACKDATE_REASON_REQUIRED: 'Add a reason for backdating this room block.',
  BASE_PRICE_MUST_BE_POSITIVE: 'The base price must be greater than ₦0.',
  BASE_PRICE_NEGATIVE: "The base price can't be negative.",
  BLOCK_CONFLICT_CANNOT_SAVE:
    'This room block overlaps an existing reservation or block. Change the dates or rooms and try again.',
  BLOCK_DURATION_TOO_LONG: "Room blocks can't be longer than 365 nights.",
  BLOCK_LAST_NIGHT_BEFORE_START:
    "The last blocked night can't be earlier than the start date.",
  CANCELLATION_OVERRIDE_REASON:
    'Add a reason for overriding the cancellation policy.',
  CANCELLATION_REASON_REQUIRED: 'Add a reason for the cancellation.',
  CHECKIN_RESPONSE_INVALID:
    "We couldn't read the check-in response. Please try again.",
  CHECKOUT_RESPONSE_INVALID:
    "We couldn't read the check-out response. Please try again.",
  DAYS_OPTIONS_INVALID: 'Choose 14, 30, or 60 days.',
  DECLINE_REASON_PROMPT: 'Add a reason for declining this reservation.',
  DECLINE_REASON_REQUIRED: 'Add a reason for declining this reservation.',
  DISCOUNT_REASON_REQUIRED: 'Add a reason for the discount.',
  END_DATE_ON_OR_AFTER_START:
    'The end date must be on or after the start date.',
  EXTRA_NAME_REQUIRED: 'Enter a name for the extra.',
  FIRST_NAME_REQUIRED: 'Enter the first name.',
  INVALID_PASSWORD_OR_2FA: "That password or 2FA code isn't valid. Try again.",
  INVALID_REFUND_AMOUNT: 'Enter a valid refund amount.',
  KEY_MIN_TWO: 'Use at least 2 characters for the key.',
  KEY_PATTERN_INVALID:
    'Use lowercase letters, numbers, and underscores for the key.',
  KEY_PATTERN_INVALID_DESCRIPTION:
    'Use lowercase letters, numbers, and underscores for the key.',
  LABEL_MIN_TWO: 'Use at least 2 characters for the label.',
  LAST_NAME_REQUIRED: 'Enter the last name.',
  MAX_QUANTITY_MIN_ONE: 'Set the maximum quantity to at least 1.',
  META_DESCRIPTION_TOO_LONG: 'Keep the meta description under 320 characters.',
  META_TITLE_TOO_LONG: 'Keep the meta title under 160 characters.',
  MINIMUM_PAYMENT: 'The minimum payment is ₦1.00.',
  NAME_MIN_TWO: 'Enter a name of at least 2 characters.',
  ONLY_OWNER_UNLOCK_SLUG:
    'Only owners can unlock and change published room URLs.',
  OVERRIDE_REASON_REQUIRED: 'Add a reason for overriding the hotel rules.',
  PAYMENT_REFERENCE_REQUIRED: 'Enter the payment reference.',
  PHONE_INVALID: 'Enter a valid phone number.',
  PLEASE_ACKNOWLEDGE_CANCELLATION:
    "Please confirm that you understand this can't be undone.",
  POSITIVE_PAYMENT_AMOUNT: 'Enter a payment amount greater than zero.',
  POSITIVE_REFUND_AMOUNT: 'Enter a refund amount greater than zero.',
  PRICE_NEGATIVE: "The price can't be negative.",
  REASON_REQUIRED: 'Add a reason.',
  REFUND_AMOUNT_POSITIVE: 'Enter a refund amount greater than zero.',
  REFUND_OVERRIDE_REASON_PROMPT:
    'Add a reason for overriding the refund amount.',
  REFUND_REASON_PROMPT: 'Add a reason for the refund.',
  REFUND_REASON_REQUIRED: 'Add a reason for the refund.',
  REJECTION_REASON_DETAILED:
    'Add a detailed reason so we can tell the guest why their payment was rejected.',
  REJECTION_REASON_REQUIRED: 'Add a reason for rejecting this payment.',
  ROOM_NUMBER_REQUIRED: 'Enter the room number.',
  ROOM_TYPE_LIMIT_OWNER_ONLY: 'Only an owner can exceed this room type limit.',
  ROOM_TYPE_LIMIT_REACHED: (limit: number) =>
    `You have reached the room type limit (${limit}). Only an owner can exceed it.`,
  RULE_NAME_REQUIRED: 'Enter a name for the rate rule.',
  SECURITY_VERIFICATION_REQUIRED: "Verify it's you",
  SIX_DIGIT_CODE_REQUIRED: 'Enter the 6-digit verification code.',
  SLUG_MIN_TWO: 'Use at least 2 characters for the slug.',
  SLUG_PATTERN_INVALID:
    'Use lowercase letters, numbers, and hyphens for the slug.',
  STAFF_DISCOUNT_REASON_REQUIRED: 'Add a reason for the staff discount.',
  STAFF_TERMS_REQUIRED: 'Accept the terms on behalf of the guest to continue.',
  START_END_DATES_REQUIRED: 'Choose a start and end date.',
  STEP_UP_PROMPT: 'Enter your password or 6-digit 2FA code.',
  UNRECONCILE_REASON_MIN_5_PERIOD:
    'Add a reason of at least 5 characters to unreconcile this payment.',
  UNRECONCILE_REASON_REQUIRED:
    'Add a reason of at least 5 characters to unreconcile this payment.',
  UNRECONCILE_REASON_TOO_SHORT: 'Add a reason of at least 5 characters.',
  VALID_PAYMENT_AMOUNT: 'Enter a valid payment amount.',
  VALID_PAYOUT_AMOUNT: 'Enter a valid payout amount.',
  VALID_POSITIVE_VERIFIED_AMOUNT:
    'Enter the amount you verified. It must be greater than zero.',
  VALID_RECIPIENT_EMAIL: 'Enter a valid email address for the recipient.',
  VALID_RECIPIENT_EMAIL_REQUIRED: 'Enter a valid recipient email address.',

  // UI notices and fallbacks
  CALCULATION_ERROR: "We couldn't calculate that. Please check the details.",
  COULD_NOT_LOAD_PAGE: "We couldn't load this page. Please try again.",
  FAILED_TO_SAVE: "We couldn't save. Please try again.",
  HOTEL_PRICING_SETTINGS_MISSING:
    'The hotel pricing settings are missing. Please contact support.',
  HOTEL_SETTINGS_MISSING:
    'The hotel settings are missing. Please contact support.',
  INVALID_PERCENTAGE: 'Enter a valid percentage.',
  INVALID_QUOTE_OR_PARAMS:
    "We couldn't calculate the quote. Please check the details.",
  PAGE_NOT_PUBLISHED: (_slug: string) => "That page isn't available right now.",
  PRICES_UNAVAILABLE: "Prices aren't available right now.",
  REFERENCE_REQUIRED: 'Enter a reference.',
  REQUEST_MISSING_DETAILS:
    'Some details are missing. Please check the form and try again.',
  REQUEST_REJECTED: "We couldn't process that request. Please try again.",
  RESERVATION_NOT_FOUND_BARE: "We couldn't find that reservation.",
  SELECT_AT_LEAST_ONE_PAYMENT: 'Select at least one payment.',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  SOMETHING_WENT_WRONG_SHORT: 'Something went wrong.',
  SOMETHING_WENT_WRONG_TITLE: 'Something went wrong',
  UNEXPECTED_ERROR: 'Something unexpected happened. Please try again.',

  // System and configuration
  BOOKING_COOKIE_SECRET_MISSING:
    "We couldn't start your booking session. Please try again later.",
  CONSENT_PROVIDER_MISSING:
    "We couldn't load this page. Please try again later.",
  DATABASE_URL_MISSING:
    'The booking service is temporarily unavailable. Please try again later.',
  JWT_SECRETS_MISSING:
    'Sign-in is temporarily unavailable. Please try again later.',
  PROOF_STORAGE_NOT_CONFIGURED:
    "Receipt uploads aren't available right now. Please email the receipt to us.",
  S3_BUCKET_MISSING:
    "Receipt uploads aren't available right now. Please email the receipt to us.",
  S3_CREDENTIALS_MISSING:
    "Receipt uploads aren't available right now. Please email the receipt to us.",
  SITE_PROVIDER_MISSING: "We couldn't load this page. Please try again later.",
  STORAGE_PROVIDER_ADAPTER_MISSING: (_id: string) =>
    "Receipt uploads aren't available right now. Please email the receipt to us.",
} as const;

export const SUCCESS_MESSAGES = {
  // General actions
  OK: 'OK',
  COPIED: 'Copied.',
  ACTION_COMPLETED: 'Action completed.',
  STATUS_VERIFIED: 'Status verified.',
  PRICE_UPDATED: 'Price updated.',
  EMAIL_SENT: 'Email sent.',

  // Room types, photos and media
  ROOM_TYPES_REORDERED: 'Room types reordered.',
  PHOTOS_REORDERED: 'Photos reordered.',
  AMENITIES_UPDATED: 'Amenities updated.',
  ROOM_TYPE_DELETED: 'Room type deleted.',
  PHOTO_UPLOADED: 'Photo uploaded.',
  IMAGE_UPDATED: 'Image updated.',
  IMAGE_DELETED: 'Image deleted.',
  COVER_PHOTO_SET: 'Cover photo updated.',

  // Rooms
  ROOM_UPDATED: 'Room updated.',
  ROOM_DELETED: 'Room deleted.',
  ROOM_UPDATED_WITH_NUMBER: (roomNumber: string) =>
    `Room ${roomNumber} updated.`,
  ROOM_ADDED_WITH_NUMBER: (roomNumber: string) => `Room ${roomNumber} added.`,
  ROOM_DELETED_WITH_NUMBER: (roomNumber: string) =>
    `Room ${roomNumber} deleted.`,

  // Amenities, extras and rate rules
  AMENITIES_REORDERED: 'Amenities reordered.',
  AMENITY_UPDATED: 'Amenity updated.',
  AMENITY_DELETED: 'Amenity deleted.',
  AMENITY_DELETED_WITH_NAME: (name: string) => `Amenity "${name}" deleted.`,
  EXTRAS_REORDERED: 'Extras reordered.',
  EXTRA_UPDATED: 'Extra updated.',
  EXTRA_DELETED: 'Extra deleted.',
  EXTRA_CREATED_WITH_NAME: (name: string) => `Extra "${name}" created.`,
  EXTRA_UPDATED_WITH_NAME: (name: string) => `Extra "${name}" updated.`,
  EXTRA_DELETED_WITH_NAME: (name: string) => `Extra "${name}" deleted.`,
  RATE_RULE_UPDATED: 'Rate rule updated.',
  RATE_RULE_DELETED: 'Rate rule deleted.',

  // Room blocks and calendar
  ROOM_BLOCK_REMOVED: 'Room block removed.',
  BLOCKS_CREATED: (count: number) =>
    `Created ${count} room ${count === 1 ? 'block' : 'blocks'}.`,

  // Staff and invitations
  PASSWORD_RESET_LINK_SENT:
    'Password reset link sent to the staff email address.',
  STAFF_DEACTIVATED:
    'Staff member deactivated. Their active sessions were signed out.',
  STAFF_UNLOCKED: 'Staff account unlocked.',
  INVITATION_RESENT: 'Invitation resent.',
  STAFF_REACTIVATED: 'Staff member reactivated.',
  STAFF_UPDATED: 'Staff member updated.',
  STAFF_PROFILE_UPDATED: 'Staff profile updated.',
  INVITATION_SENT: 'Invitation sent.',
  INVITATION_SENT_TO: (email: string) => `Invitation sent to ${email}.`,
  ADMIN_RESET_SENT_EXPIRY:
    'If that email belongs to a staff account, a reset link has been sent. It expires in 60 minutes.',

  // Security and sessions
  STAFF_2FA_RESET:
    'Two-factor authentication reset. The staff member must set it up again at their next sign-in.',
  SESSIONS_REVOKED: 'All active sessions signed out.',
  STEP_UP_VERIFIED: 'Identity verified.',
  TWO_FACTOR_DISABLED: 'Two-factor authentication is now disabled.',
  RECOVERY_CODES_ROTATED:
    'New recovery codes generated. The old codes no longer work.',
  PASSWORD_CHANGED: (revoked: number) =>
    revoked > 0
      ? `Password changed. ${revoked} other ${
          revoked === 1 ? 'session was' : 'sessions were'
        } signed out.`
      : 'Password changed.',
  SESSIONS_SIGNED_OUT: (count: number) =>
    count === 0
      ? 'There were no other sessions to sign out.'
      : `${count} ${count === 1 ? 'session was' : 'sessions were'} signed out.`,

  // Payments, refunds and reconciliation
  PAYMENT_UNRECONCILED: 'Payment marked as unreconciled.',
  REFUND_PAYOUT_MARKED_PAID: 'Refund payout marked as paid.',
  WEBHOOK_REPROCESSED: 'Payment event reprocessed.',
  PROVIDER_REFUND_RECHECKED:
    'Refund status checked. The payment provider is still processing it.',

  // Guest bookings and stays
  BOOKING_UPDATED: 'Your booking has been updated.',
  DETAILS_SAVED: 'Your details have been saved.',
  PROFILE_UPDATED: 'Profile updated.',
  DATES_CHANGED: 'Your dates have been changed.',
  NEW_DATES_HELD: 'Your new dates are held while you pay.',
  BOOKING_CANCELLED: 'Your booking has been cancelled.',
  PAYMENT_RECEIVED: 'Your payment was received.',
  TRANSFER_RECEIPT_RECEIVED:
    'We have your receipt. The hotel will verify it and email you.',
  GUEST_CHECKED_IN: (name: string) => `Guest ${name} checked in.`,
  GUEST_CHECKED_OUT: (name: string) => `Guest ${name} checked out.`,

  // Booking emails and confirmations
  CONFIRMATION_EMAIL_RESENT: 'Confirmation email sent again.',
  CONFIRMATION_EMAIL_SENT: 'Confirmation email sent.',
  UPDATED_BOOKING_EMAILED: 'Your updated booking was emailed to you.',
  CANCELLATION_CONFIRMED_EMAIL: 'Your cancellation was confirmed by email.',
  DETAILS_CHANGES_EMAILED: 'A summary of your changes was emailed to you.',
} as const;

import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import * as schema from './schema';

// Settings
export type HotelSettings = InferSelectModel<typeof schema.hotelSettings>;
export type NewHotelSettings = InferInsertModel<typeof schema.hotelSettings>;
export type BankAccount = InferSelectModel<typeof schema.bankAccounts>;
export type NewBankAccount = InferInsertModel<typeof schema.bankAccounts>;
export type SocialLink = InferSelectModel<typeof schema.socialLinks>;
export type NewSocialLink = InferInsertModel<typeof schema.socialLinks>;

// Staff
export type StaffUser = InferSelectModel<typeof schema.staffUsers>;
export type NewStaffUser = InferInsertModel<typeof schema.staffUsers>;
export type StaffSession = InferSelectModel<typeof schema.staffSessions>;
export type NewStaffSession = InferInsertModel<typeof schema.staffSessions>;
export type PasswordResetToken = InferSelectModel<
  typeof schema.passwordResetTokens
>;
export type NewPasswordResetToken = InferInsertModel<
  typeof schema.passwordResetTokens
>;

// Rooms
export type RoomType = InferSelectModel<typeof schema.roomTypes>;
export type NewRoomType = InferInsertModel<typeof schema.roomTypes>;
export type Room = InferSelectModel<typeof schema.rooms>;
export type NewRoom = InferInsertModel<typeof schema.rooms>;
export type Amenity = InferSelectModel<typeof schema.amenities>;
export type NewAmenity = InferInsertModel<typeof schema.amenities>;
export type RoomBlock = InferSelectModel<typeof schema.roomBlocks>;
export type NewRoomBlock = InferInsertModel<typeof schema.roomBlocks>;
export type RateRule = InferSelectModel<typeof schema.rateRules>;
export type NewRateRule = InferInsertModel<typeof schema.rateRules>;
export type Extra = InferSelectModel<typeof schema.extras>;
export type NewExtra = InferInsertModel<typeof schema.extras>;

// Bookings
export type Reservation = InferSelectModel<typeof schema.reservations>;
export type NewReservation = InferInsertModel<typeof schema.reservations>;
export type ReservationNight = InferSelectModel<
  typeof schema.reservationNights
>;
export type NewReservationNight = InferInsertModel<
  typeof schema.reservationNights
>;
export type ReservationExtra = InferSelectModel<
  typeof schema.reservationExtras
>;
export type NewReservationExtra = InferInsertModel<
  typeof schema.reservationExtras
>;
export type Payment = InferSelectModel<typeof schema.payments>;
export type NewPayment = InferInsertModel<typeof schema.payments>;
export type IdempotencyKey = InferSelectModel<typeof schema.idempotencyKeys>;
export type NewIdempotencyKey = InferInsertModel<typeof schema.idempotencyKeys>;

// Content
export type Enquiry = InferSelectModel<typeof schema.enquiries>;
export type NewEnquiry = InferInsertModel<typeof schema.enquiries>;
export type SitePage = InferSelectModel<typeof schema.sitePages>;
export type NewSitePage = InferInsertModel<typeof schema.sitePages>;
export type Facility = InferSelectModel<typeof schema.facilities>;
export type NewFacility = InferInsertModel<typeof schema.facilities>;
export type GalleryImage = InferSelectModel<typeof schema.galleryImages>;
export type NewGalleryImage = InferInsertModel<typeof schema.galleryImages>;
export type Testimonial = InferSelectModel<typeof schema.testimonials>;
export type NewTestimonial = InferInsertModel<typeof schema.testimonials>;
export type Faq = InferSelectModel<typeof schema.faqs>;
export type NewFaq = InferInsertModel<typeof schema.faqs>;

// Notifications & Audit
export type NotificationTemplate = InferSelectModel<
  typeof schema.notificationTemplates
>;
export type NewNotificationTemplate = InferInsertModel<
  typeof schema.notificationTemplates
>;
export type NotificationLog = InferSelectModel<typeof schema.notificationLogs>;
export type NewNotificationLog = InferInsertModel<
  typeof schema.notificationLogs
>;
export type AuditLog = InferSelectModel<typeof schema.auditLogs>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLogs>;
export type SeedRecord = InferSelectModel<typeof schema.seedRecords>;
export type NewSeedRecord = InferInsertModel<typeof schema.seedRecords>;

// Staff additional
export type StaffRecoveryCode = InferSelectModel<
  typeof schema.staffRecoveryCodes
>;
export type NewStaffRecoveryCode = InferInsertModel<
  typeof schema.staffRecoveryCodes
>;

// Rooms additional
export type RoomTypeAmenity = InferSelectModel<typeof schema.roomTypeAmenities>;
export type NewRoomTypeAmenity = InferInsertModel<
  typeof schema.roomTypeAmenities
>;

// Bookings additional
export type ReservationStatusHistory = InferSelectModel<
  typeof schema.reservationStatusHistory
>;
export type NewReservationStatusHistory = InferInsertModel<
  typeof schema.reservationStatusHistory
>;
export type PaymentWebhookEvent = InferSelectModel<
  typeof schema.paymentWebhookEvents
>;
export type NewPaymentWebhookEvent = InferInsertModel<
  typeof schema.paymentWebhookEvents
>;
export type Quote = InferSelectModel<typeof schema.quotes>;
export type NewQuote = InferInsertModel<typeof schema.quotes>;

// Content additional
export type EnquiryReply = InferSelectModel<typeof schema.enquiryReplies>;
export type NewEnquiryReply = InferInsertModel<typeof schema.enquiryReplies>;
export type EnquiryNote = InferSelectModel<typeof schema.enquiryNotes>;
export type NewEnquiryNote = InferInsertModel<typeof schema.enquiryNotes>;
export type SitePageRevision = InferSelectModel<
  typeof schema.sitePageRevisions
>;
export type NewSitePageRevision = InferInsertModel<
  typeof schema.sitePageRevisions
>;
export type TeamMember = InferSelectModel<typeof schema.teamMembers>;
export type NewTeamMember = InferInsertModel<typeof schema.teamMembers>;
export type NearbyAttraction = InferSelectModel<
  typeof schema.nearbyAttractions
>;
export type NewNearbyAttraction = InferInsertModel<
  typeof schema.nearbyAttractions
>;

// Notifications additional
export type NotificationRecipient = InferSelectModel<
  typeof schema.notificationRecipients
>;
export type NewNotificationRecipient = InferInsertModel<
  typeof schema.notificationRecipients
>;

// Relations
import { relations } from 'drizzle-orm';

import { auditLogs } from './audit';
import {
  payments,
  reservationExtras,
  reservationNights,
  reservations,
  reservationStatusHistory,
} from './bookings';
import {
  enquiries,
  enquiryNotes,
  enquiryReplies,
  sitePageRevisions,
  sitePages,
} from './content';
import { notificationLogs } from './notifications';
import {
  amenities,
  rateRules,
  roomBlocks,
  rooms,
  roomTypeAmenities,
  roomTypes,
} from './rooms';
import {
  passwordResetTokens,
  staffRecoveryCodes,
  staffSessions,
  staffUsers,
} from './staff';

export * from './audit';
export * from './bookings';
export * from './content';
export * from './enums';
export * from './notifications';
export * from './rooms';
export * from './settings';
export * from './staff';

export const roomTypesRelations = relations(roomTypes, ({ many }) => ({
  rooms: many(rooms),
  amenities: many(roomTypeAmenities),
  rateRules: many(rateRules),
  reservations: many(reservations),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  roomType: one(roomTypes, {
    fields: [rooms.roomTypeId],
    references: [roomTypes.id],
  }),
  blocks: many(roomBlocks),
  reservations: many(reservations),
}));

export const roomTypeAmenitiesRelations = relations(
  roomTypeAmenities,
  ({ one }) => ({
    roomType: one(roomTypes, {
      fields: [roomTypeAmenities.roomTypeId],
      references: [roomTypes.id],
    }),
    amenity: one(amenities, {
      fields: [roomTypeAmenities.amenityId],
      references: [amenities.id],
    }),
  }),
);

export const staffUsersRelations = relations(staffUsers, ({ many }) => ({
  sessions: many(staffSessions),
  recoveryCodes: many(staffRecoveryCodes),
  resetTokens: many(passwordResetTokens),
}));

export const staffSessionsRelations = relations(staffSessions, ({ one }) => ({
  staffUser: one(staffUsers, {
    fields: [staffSessions.staffUserId],
    references: [staffUsers.id],
  }),
}));

export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    room: one(rooms, {
      fields: [reservations.roomId],
      references: [rooms.id],
    }),
    roomType: one(roomTypes, {
      fields: [reservations.roomTypeId],
      references: [roomTypes.id],
    }),
    confirmedByStaff: one(staffUsers, {
      fields: [reservations.confirmedBy],
      references: [staffUsers.id],
    }),
    nights: many(reservationNights),
    extras: many(reservationExtras),
    statusHistory: many(reservationStatusHistory),
    payments: many(payments),
  }),
);

export const reservationNightsRelations = relations(
  reservationNights,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationNights.reservationId],
      references: [reservations.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  reservation: one(reservations, {
    fields: [payments.reservationId],
    references: [reservations.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ many }) => ({
  replies: many(enquiryReplies),
  notes: many(enquiryNotes),
}));

export const enquiryRepliesRelations = relations(enquiryReplies, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [enquiryReplies.enquiryId],
    references: [enquiries.id],
  }),
  staffUser: one(staffUsers, {
    fields: [enquiryReplies.staffUserId],
    references: [staffUsers.id],
  }),
}));

export const sitePagesRelations = relations(sitePages, ({ many }) => ({
  revisions: many(sitePageRevisions),
}));

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [notificationLogs.reservationId],
      references: [reservations.id],
    }),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(staffUsers, {
    fields: [auditLogs.actorId],
    references: [staffUsers.id],
  }),
}));

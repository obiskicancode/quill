'use client';

import {
  EnquiryFormShell,
  RoomTypeField,
  type EnquiryFormCopy,
  type EnquiryFormShellContext,
} from '@/components/forms/EnquiryFormShell';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { type EnquiryFormInput } from '@/schemas/content.schema';
import type { ISODate } from '@/types/dates.types';
import type { RoomType, StayParams } from '@/types/rooms.types';

import { GuestStepper } from '../GuestStepper';
import { FieldLegend, FieldSet } from '../ui/field';
import { AvailabilityHint } from './AvailabilityHint';

interface EnquiryFormProps {
  rooms: RoomType[];
  responseHours: number;
  whatsappHref: string;
  /** A room slug from ?room= to pre-select. */
  initialRoom: string | null;
  /** Which page sent this enquiry. */
  sourcePage: string;
}
function formDefaults(roomType: string, sourcePage: string): EnquiryFormInput {
  return {
    name: '',
    email: '',
    phone: '',
    topic: 'booking_enquiry',
    subject: '',
    message: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    adults: '2',
    children: '0',
    roomType,
    source_page: sourcePage,
    consent: false,
  };
}
const copy: EnquiryFormCopy = {
  title: 'Send us a booking enquiry',
  intro: (hours) =>
    `Tell us your dates and we\u2019ll confirm availability within ${hours}.`,
  successTitle: (hours) => `Thanks, we\u2019ll be in touch within ${hours}`,
  noun: 'enquiry',
  submitLabel: 'Send enquiry',
  anotherLabel: 'Send another enquiry',
  notSentTitle: ERROR_MESSAGES.ENQUIRY_NOT_SENT,
  rateLimitedMessage: ERROR_MESSAGES.ENQUIRY_RATE_LIMITED,
  couldNotSendFallback: ERROR_MESSAGES.COULD_NOT_SEND_ENQUIRY,
  messagePlaceholder: 'Anything we should know about your stay?',
};
function renderStay(ctx: EnquiryFormShellContext, rooms: RoomType[]) {
  const stay: StayParams | null =
    ctx.values.checkIn &&
    ctx.values.checkOut &&
    ctx.values.checkOut > ctx.values.checkIn
      ? {
          checkIn: ctx.values.checkIn as ISODate,
          checkOut: ctx.values.checkOut as ISODate,
          adults: Number(ctx.values.adults) || 0,
          children: Number(ctx.values.children) || 0,
        }
      : null;
  return (
    <FieldSet className="space-y-5 rounded-card border border-line bg-card p-5">
      <FieldLegend className="px-2 font-semibold">Your stay</FieldLegend>
      {ctx.dates}
      <div className="divide-y divide-line border-t border-line">
        <GuestStepper
          id={ctx.fieldId('adults')}
          label="Adults"
          unit={{ one: 'adult', many: 'adults' }}
          hint="Ages 18 or above"
          min={1}
          max={12}
          value={Number(ctx.values.adults) || 0}
          onChange={(count) =>
            ctx.setValue('adults', String(count), {
              shouldDirty: true,
              shouldValidate: ctx.submitted,
            })
          }
        />
        <GuestStepper
          id={ctx.fieldId('children')}
          label="Children"
          unit={{ one: 'child', many: 'children' }}
          hint="Ages 0 to 17"
          min={0}
          max={8}
          value={Number(ctx.values.children) || 0}
          onChange={(count) =>
            ctx.setValue('children', String(count), {
              shouldDirty: true,
              shouldValidate: ctx.submitted,
            })
          }
        />
      </div>
      <AvailabilityHint
        rooms={rooms}
        roomSlug={ctx.values.roomType ?? ''}
        stay={stay}
      />
    </FieldSet>
  );
}
/**
 * Booking enquiry form. Dates and guest numbers are required.
 * Nothing the guest types is ever lost: validation errors, rate limits and server failures all keep the form.
 */
export function EnquiryForm({
  rooms,
  responseHours,
  whatsappHref,
  initialRoom,
  sourcePage,
}: EnquiryFormProps) {
  const initialRoomType = rooms.some((room) => room.slug === initialRoom)
    ? (initialRoom as string)
    : '';
  const defaults = () => formDefaults(initialRoomType, sourcePage);
  return (
    <EnquiryFormShell
      idPrefix="enquiry"
      sectionId="enquiry"
      sectionClassName="space-y-6"
      draftKey="public-enquiry"
      defaults={defaults}
      responseHours={responseHours}
      whatsappHref={whatsappHref}
      copy={copy}
      renderAfterPhone={(ctx) => <RoomTypeField ctx={ctx} rooms={rooms} />}
      renderStay={(ctx) => renderStay(ctx, rooms)}
    />
  );
}

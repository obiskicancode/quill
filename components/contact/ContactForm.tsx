'use client';

import { Controller } from 'react-hook-form';

import {
  EnquiryFormShell,
  RoomTypeField,
  type EnquiryFormCopy,
  type EnquiryFormShellContext,
} from '@/components/forms/EnquiryFormShell';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTACT_TOPICS } from '@/constants/content';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  normalizeTopic,
  STAY_TOPICS,
  topicLabels,
  type EnquiryFormInput,
} from '@/schemas/content.schema';
import type { EnquiryTopic } from '@/types/content.types';

interface ContactFormProps {
  initialTopic: string | null;
  /** A room slug from ?room=. */
  initialRoom: string | null;
  /** A booking reference from older links. It is put at the top of the message. */
  initialRef: string | null;
  rooms: { slug: string; name: string }[];
  responseHours: number;
  whatsappHref: string;
}
/** A topic the contact form can actually show (the booking enquiry has its own page). */
function contactTopic(raw: string | null): EnquiryTopic {
  const topic = normalizeTopic(raw);
  return (CONTACT_TOPICS as readonly EnquiryTopic[]).includes(topic)
    ? topic
    : 'general';
}
function formDefaults(
  topic: EnquiryTopic,
  roomType: string,
  message: string,
): EnquiryFormInput {
  return {
    name: '',
    email: '',
    phone: '',
    topic,
    subject: '',
    message,
    checkIn: '',
    checkOut: '',
    guests: '',
    adults: '',
    children: '',
    roomType,
    source_page: '',
    consent: false,
  };
}
const copy: EnquiryFormCopy = {
  title: 'Send us a message',
  intro: (hours) => `We reply within ${hours}.`,
  successTitle: (hours) => `Thanks, we\u2019ll reply within ${hours}`,
  noun: 'message',
  submitLabel: 'Send message',
  anotherLabel: 'Send another message',
  notSentTitle: ERROR_MESSAGES.MESSAGE_NOT_SENT,
  rateLimitedMessage: ERROR_MESSAGES.CONTACT_RATE_LIMITED,
  couldNotSendFallback: ERROR_MESSAGES.COULD_NOT_SEND_MESSAGE,
};
function renderAfterPhone(ctx: EnquiryFormShellContext) {
  return (
    <Field
      id={ctx.fieldId('topic')}
      label="What is this about?"
      error={ctx.errors.topic?.message}
    >
      {(a) => (
        <Controller
          control={ctx.control}
          name="topic"
          render={({ field }) => (
            <Select
              items={CONTACT_TOPICS.map((topic) => ({
                value: topic,
                label: topicLabels[topic],
              }))}
              value={field.value}
              onValueChange={(value) =>
                field.onChange((value ?? 'general') as EnquiryTopic)
              }
              disabled={ctx.busy}
            >
              <SelectTrigger
                id={a.id}
                aria-describedby={a['aria-describedby']}
                aria-invalid={a['aria-invalid']}
                onBlur={field.onBlur}
                className={inputClass(ctx.errors.topic?.message)}
              >
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topicLabels[topic]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </Field>
  );
}
function renderBeforeStay(ctx: EnquiryFormShellContext) {
  return (
    <Field
      id={ctx.fieldId('subject')}
      label="Subject"
      optional
      error={ctx.errors.subject?.message}
    >
      {(a) => (
        <Input
          {...a}
          {...ctx.register('subject')}
          type="text"
          autoComplete="off"
          disabled={ctx.busy}
          className={inputClass(ctx.errors.subject?.message)}
        />
      )}
    </Field>
  );
}
function renderStay(
  ctx: EnquiryFormShellContext,
  rooms: { slug: string; name: string }[],
) {
  if (!STAY_TOPICS.includes(ctx.values.topic)) return null;
  return (
    <FieldSet className="space-y-5 rounded-card border border-line bg-card p-5">
      <FieldLegend className="px-2 font-semibold">
        Your stay (optional)
      </FieldLegend>
      {ctx.dates}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id={ctx.fieldId('guests')}
          label="Number of guests"
          optional
          error={ctx.errors.guests?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...ctx.register('guests')}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={ctx.busy}
              className={inputClass(ctx.errors.guests?.message)}
            />
          )}
        </Field>
        <RoomTypeField ctx={ctx} rooms={rooms} />
      </div>
    </FieldSet>
  );
}
/** Contact form with validation, server errors and success state. */
export function ContactForm({
  initialTopic,
  initialRoom,
  initialRef,
  rooms,
  responseHours,
  whatsappHref,
}: ContactFormProps) {
  const safeRef =
    initialRef && /^[A-Za-z0-9-]{4,30}$/.test(initialRef) ? initialRef : null;
  const initialRoomType = rooms.some((room) => room.slug === initialRoom)
    ? (initialRoom as string)
    : '';
  const initialMessage = safeRef ? `Booking reference: ${safeRef}\n\n` : '';
  const defaults = () =>
    formDefaults(contactTopic(initialTopic), initialRoomType, initialMessage);
  return (
    <EnquiryFormShell
      idPrefix="contact"
      sectionId="enquiry"
      sectionClassName="section-y"
      containerClassName="container-page max-w-3xl"
      draftKey="public-contact"
      defaults={defaults}
      responseHours={responseHours}
      whatsappHref={whatsappHref}
      whatsappExternal
      copy={copy}
      prepare={(input) =>
        STAY_TOPICS.includes(input.topic)
          ? input
          : { ...input, checkIn: '', checkOut: '', guests: '', roomType: '' }
      }
      renderAfterPhone={renderAfterPhone}
      renderBeforeStay={renderBeforeStay}
      renderStay={(ctx) => renderStay(ctx, rooms)}
    />
  );
}

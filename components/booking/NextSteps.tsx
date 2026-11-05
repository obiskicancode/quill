'use client';

import { Check } from 'lucide-react';

import { TextLink } from '@/components/ui/text-link';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatGuestTime, formatMinor } from '@/lib/format';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation, HeaderKind } from '@/types/booking.types';

import { StaggerGroup, StaggerItem } from '../motion';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

interface Step {
  title: string;
  state: 'done' | 'now' | 'next';
}

function stepsFor(kind: HeaderKind, v: GuestReservation): Step[] {
  const arrive: Step = {
    title: `Arrive from ${formatGuestTime(v.times.checkIn)}${v.policy.idRequired ? ' with a valid photo ID' : ''}.`,
    state: 'next',
  };
  const balance: Step[] =
    v.amounts.balanceMinor > 0
      ? [
          {
            title: `Pay the balance of ${formatMinor(v.amounts.balanceMinor)} at the hotel.`,
            state: 'next',
          },
        ]
      : [];
  switch (kind) {
    case 'confirmed':
    case 'confirmed-deposit':
      return [
        { title: SUCCESS_MESSAGES.CONFIRMATION_EMAIL_SENT, state: 'done' },
        { title: 'We send you a reminder before you arrive.', state: 'next' },
        arrive,
        ...balance,
      ];
    case 'confirming':
      return [
        {
          title:
            'Your payment provider confirms the payment. This is happening now.',
          state: 'now',
        },
        { title: 'We email your confirmation.', state: 'next' },
        arrive,
      ];
    case 'transfer':
      return [
        {
          title: v.proofUploaded
            ? 'Receipt received.'
            : 'Make the transfer and upload your receipt.',
          state: v.proofUploaded ? 'done' : 'now',
        },
        {
          title: 'The hotel verifies your transfer.',
          state: v.proofUploaded ? 'now' : 'next',
        },
        { title: 'We email your confirmation.', state: 'next' },
        arrive,
      ];
    case 'approval':
      return [
        {
          title: `The hotel reviews your request, usually ${v.approvalResponse}.`,
          state: 'now',
        },
        { title: 'We email you once it is approved.', state: 'next' },
        arrive,
        ...balance,
      ];
    case 'pay-at-hotel':
      return [
        { title: 'Booking details emailed to you.', state: 'done' },
        { title: 'The hotel confirms by email.', state: 'now' },
        arrive,
        ...balance,
      ];
    default:
      return [
        {
          title: 'Choose Book again to pick your dates and pay.',
          state: 'now',
        },
        { title: 'Or contact the hotel and we will help.', state: 'next' },
      ];
  }
}

export function NextSteps({
  v,
  kind,
}: {
  v: GuestReservation;
  kind: HeaderKind;
}) {
  const site = useSite();
  const steps = stepsFor(kind, v);
  return (
    <Card
      render={<section aria-labelledby="next-title" />}
      className="text-body [--card-spacing:--spacing(5)] md:[--card-spacing:--spacing(6)]"
    >
      <CardHeader>
        <CardTitle
          id="next-title"
          render={<h2 />}
          className="font-display text-h3"
        >
          What happens next
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StaggerGroup as="ol" staggerChildren={0.06} className="space-y-4">
          {steps.map((s, i) => (
            <StaggerItem key={i} as="li" className="flex gap-4">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-small font-semibold ${s.state === 'done' ? 'bg-ink text-paper' : s.state === 'now' ? 'bg-primary text-primary-foreground' : 'border border-ink/50 text-muted-foreground'}`}
              >
                {s.state === 'done' ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              <p
                className={`pt-1 ${s.state === 'next' ? 'text-ink/85' : 'font-semibold'}`}
              >
                {s.title}
                <span className="sr-only">
                  {s.state === 'done'
                    ? ' (done)'
                    : s.state === 'now'
                      ? ' (in progress)'
                      : ''}
                </span>
              </p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </CardContent>
      {kind !== 'ended' && (
        <CardFooter className="flex-col items-start gap-2 bg-transparent pt-0 text-small">
          {v.policy.idRequired && (
            <p>
              <span className="font-semibold">ID at check-in: </span>
              {v.policy.idText}
            </p>
          )}
          {v.guest.arrival && (
            <p>
              <span className="font-semibold">Your arrival: </span>
              {v.guest.arrival}.{' '}
              <TextLink
                href={whatsappHref(
                  site,
                  `Hello, my plans changed for booking ${v.reference}. I will now arrive at: `,
                )}
                external
              >
                Tell the hotel about changes
                <span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </TextLink>
            </p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Gift, PencilLine, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatRange } from '@/lib/rooms';
import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation } from '@/types/booking.types';

import { AnimatedList } from '../motion';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';

interface ActionsPanelProps {
  v: GuestReservation;
  onCancel: (trigger: HTMLElement) => void;
  onChangeDates: (trigger: HTMLElement) => void;
  onEdit: (trigger: HTMLElement) => void;
}

/**
 * Primary actions, shown only when they apply to the current status and policy. Anything the rules do not allow
 * routes to the hotel in one tap, with the reference already filled in, so nobody hits a dead end.
 */
export function ActionsPanel({
  v,
  onCancel,
  onChangeDates,
  onEdit,
}: ActionsPanelProps) {
  const site = useSite();
  const m = v.manage;
  const reduced = useReducedMotion();
  const li = reduced
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.2, ease: EASE_OUT },
      };
  if (!m) return null;
  const { canCancel, canChangeDates, canEditDetails, canAddExtras } = m.allowed;
  const finished =
    !canCancel.allowed && !canChangeDates.allowed && !canEditDetails.allowed;
  /** One action leads: the first thing a guest on this booking is most likely here for. */
  const primary = canChangeDates.allowed
    ? 'dates'
    : canEditDetails.allowed
      ? 'edit'
      : canAddExtras.allowed
        ? 'extras'
        : null;

  const dates =
    v.stay.checkIn && v.stay.checkOut
      ? formatRange(v.stay.checkIn, v.stay.checkOut)
      : 'my current dates';
  const askHotel = (text: string) =>
    whatsappHref(site, `Hello, ${text} (booking ${v.reference}).`);
  const contact = (text: string) => (
    <div className="mt-3 flex flex-col flex-wrap gap-3 sm:flex-row">
      <ButtonLink href={askHotel(text)} external variant="secondary" size="sm">
        Ask the hotel on WhatsApp
        <span className="sr-only"> (opens in a new tab)</span>
      </ButtonLink>
      <ButtonLink href={telHref(site)} variant="secondary" size="sm">
        Call the hotel
      </ButtonLink>
    </div>
  );

  return (
    <section
      aria-labelledby="actions-title"
      className="rounded-card border border-line bg-card p-5 shadow-raised md:p-6 print:hidden"
    >
      <h2 id="actions-title" className="font-display text-h3">
        {finished ? 'About this booking' : 'What would you like to do?'}
      </h2>

      <AnimatedList className="mt-5 grid gap-3 sm:grid-cols-2">
        {canChangeDates.allowed && (
          <motion.li key="dates" {...li}>
            <Button
              variant={primary === 'dates' ? 'primary' : 'secondary'}
              className="w-full"
              icon={<CalendarClock className="size-5" aria-hidden />}
              onClick={(e) => onChangeDates(e.currentTarget)}
            >
              Change dates
            </Button>
          </motion.li>
        )}
        {canEditDetails.allowed && (
          <motion.li key="edit" {...li}>
            <Button
              variant={primary === 'edit' ? 'primary' : 'secondary'}
              className="w-full"
              icon={<PencilLine className="size-5" aria-hidden />}
              onClick={(e) => onEdit(e.currentTarget)}
            >
              Edit details
            </Button>
          </motion.li>
        )}
        {canAddExtras.allowed && (
          <motion.li key="extras" {...li}>
            <ButtonLink
              href="#add-extras"
              variant={primary === 'extras' ? 'primary' : 'secondary'}
              className="w-full"
              icon={<Gift className="size-5" aria-hidden />}
            >
              Add extras
            </ButtonLink>
          </motion.li>
        )}
      </AnimatedList>

      {canCancel.allowed && (
        <div className="mt-5 border-t border-line pt-5">
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            icon={<XCircle className="size-5" aria-hidden />}
            onClick={(e) => onCancel(e.currentTarget)}
          >
            Cancel booking
          </Button>
        </div>
      )}

      {!canChangeDates.allowed && !finished && (
        <Alert variant="neutral" size="panel" className="mt-5">
          <AlertTitle>Dates can&rsquo;t be changed online</AlertTitle>
          <AlertDescription>{canChangeDates.reason}</AlertDescription>
          {contact(
            `I'd like to change the dates for ${dates}. The dates I would like are: `,
          )}
        </Alert>
      )}

      {!canCancel.allowed && (
        <Alert variant="neutral" size="panel" className="mt-5">
          <AlertTitle>This booking can&rsquo;t be cancelled online</AlertTitle>
          <AlertDescription>{canCancel.reason}</AlertDescription>
          {contact('I have a question about cancelling')}
        </Alert>
      )}
    </section>
  );
}

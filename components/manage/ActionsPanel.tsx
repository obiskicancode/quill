'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Gift, PencilLine, XCircle } from 'lucide-react';

import { formatRange } from '@/lib/rooms';
import { telHref, whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type { GuestReservation } from '@/types/booking.types';

import { AnimatedList } from '../motion';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/Button';

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

  const dates =
    v.stay.checkIn && v.stay.checkOut
      ? formatRange(v.stay.checkIn, v.stay.checkOut)
      : 'my current dates';
  const askHotel = (text: string) =>
    whatsappHref(site, `Hello, ${text} (booking ${v.reference}).`);
  const contact = (text: string) => (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
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
      className="rounded-card border border-line bg-surface p-5 shadow-raised md:p-6 print:hidden"
    >
      <h2 id="actions-title" className="font-display text-h3">
        {finished ? 'About this booking' : 'What would you like to do?'}
      </h2>

      <AnimatedList className="mt-5 grid gap-3 sm:grid-cols-2">
        {canChangeDates.allowed && (
          <motion.li key="dates" {...li}>
            <Button
              variant="secondary"
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
              variant="secondary"
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
              variant="secondary"
              className="w-full"
              icon={<Gift className="size-5" aria-hidden />}
            >
              Add extras
            </ButtonLink>
          </motion.li>
        )}
        {canCancel.allowed && (
          <motion.li key="cancel" {...li}>
            <Button
              variant="secondary"
              className="w-full"
              icon={<XCircle className="size-5" aria-hidden />}
              onClick={(e) => onCancel(e.currentTarget)}
            >
              Cancel booking
            </Button>
          </motion.li>
        )}
      </AnimatedList>

      {!canChangeDates.allowed && !finished && (
        <div className="mt-5 rounded-control bg-paper p-4 text-small">
          <p className="font-semibold">Dates can&rsquo;t be changed online</p>
          <p className="mt-1 text-ink/85">{canChangeDates.reason}</p>
          {contact(
            `I'd like to change the dates for ${dates}. The dates I would like are: `,
          )}
        </div>
      )}

      {!canCancel.allowed && (
        <div className="mt-5 rounded-control bg-paper p-4 text-small">
          <p className="font-semibold">
            This booking can&rsquo;t be cancelled online
          </p>
          <p className="mt-1 text-ink/85">{canCancel.reason}</p>
          {contact('I have a question about cancelling')}
        </div>
      )}
    </section>
  );
}

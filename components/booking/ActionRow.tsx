'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarPlus, MessageCircle, Printer, Settings2 } from 'lucide-react';

import { bookingService } from '@/app/api/services/booking.service';
import {
  googleCalendarUrl,
  whatsappShareUrl,
  type CalendarEvent,
} from '@/lib/booking/ics';
import { formatRange } from '@/lib/rooms';
import type { GuestReservation } from '@/types/booking.types';

import { AnimatedList } from '../motion';
import { EASE_OUT } from '../motion/variants';
import { Button, ButtonLink } from '../ui/button';

/** Calendar (.ics and Google), print or save as PDF, WhatsApp share, and Manage booking. */
export function ActionRow({
  v,
  hideManage = false,
}: {
  v: GuestReservation;
  /** Hide "Manage booking" when already on the manage page. */ hideManage?: boolean;
}) {
  const { checkIn, checkOut } = v.stay;
  const ready = Boolean(checkIn && checkOut);
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
  const event: CalendarEvent | null =
    checkIn && checkOut
      ? {
          reference: v.reference,
          hotelName: v.hotel.name,
          address: v.hotel.addressLines.join(', '),
          checkIn,
          checkOut,
          checkInTime: v.times.checkIn24,
          checkOutTime: v.times.checkOut24,
          timeZone: v.times.timeZone,
        }
      : null;
  const active =
    v.status !== 'expired' &&
    v.status !== 'payment_failed' &&
    v.status !== 'cancelled';
  const datesLabel =
    checkIn && checkOut
      ? formatRange(checkIn, checkOut)
      : 'Dates to be confirmed';

  return (
    <section aria-label="Actions" className="print:hidden">
      <AnimatedList className="flex flex-wrap gap-3">
        {active && (
          <motion.li key="ics" {...li}>
            {ready && event ? (
              <ButtonLink
                href={bookingService.calendarUrl(v.reference)}
                variant="secondary"
                download
                icon={<CalendarPlus className="size-5" aria-hidden />}
              >
                Add to calendar (.ics)
              </ButtonLink>
            ) : (
              <Button
                variant="secondary"
                disabled
                icon={<CalendarPlus className="size-5" aria-hidden />}
              >
                Add to calendar (.ics)
              </Button>
            )}
          </motion.li>
        )}
        {active && (
          <motion.li key="google" {...li}>
            {ready && event ? (
              <ButtonLink
                href={googleCalendarUrl(event)}
                external
                variant="secondary"
              >
                Google Calendar
                <span className="sr-only"> (opens in a new tab)</span>
              </ButtonLink>
            ) : (
              <Button variant="secondary" disabled>
                Google Calendar
              </Button>
            )}
          </motion.li>
        )}
        <motion.li key="print" {...li}>
          <Button
            variant="secondary"
            disabled={!ready}
            icon={<Printer className="size-5" aria-hidden />}
            onClick={() => window.print()}
          >
            Print or save as PDF
          </Button>
        </motion.li>
        <motion.li key="share" {...li}>
          <ButtonLink
            href={whatsappShareUrl({
              reference: v.reference,
              hotelName: v.hotel.name,
              address: v.hotel.addressLines.join(', '),
              checkIn: checkIn ?? '',
              checkOut: checkOut ?? '',
              datesLabel,
            })}
            external
            variant="secondary"
            icon={<MessageCircle className="size-5" aria-hidden />}
          >
            Share by WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </ButtonLink>
        </motion.li>
        {active && !hideManage && (
          <motion.li key="manage" {...li}>
            <ButtonLink
              href={`/booking/manage?ref=${encodeURIComponent(v.reference)}`}
              variant="secondary"
              icon={<Settings2 className="size-5" aria-hidden />}
            >
              Manage booking
            </ButtonLink>
          </motion.li>
        )}
      </AnimatedList>
      {!ready && (
        <p className="text-small text-muted-foreground mt-3">
          Calendar and print are unavailable until your check-in date is
          confirmed.
        </p>
      )}
    </section>
  );
}

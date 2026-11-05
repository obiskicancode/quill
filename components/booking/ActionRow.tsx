'use client';

import Link from 'next/link';
import {
  CalendarPlus,
  ChevronDown,
  MessageCircle,
  Printer,
  Settings2,
} from 'lucide-react';

import { bookingService } from '@/app/api/services/booking.service';
import {
  calendarEventFor,
  googleCalendarUrl,
  whatsappShareUrl,
} from '@/lib/booking/ics';
import { headerKind, headerOwnsCalendar } from '@/lib/booking/status';
import { formatRange } from '@/lib/rooms';
import type { GuestReservation } from '@/types/booking.types';

import { Button, ButtonLink } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * Saving or sharing the booking. One action leads — the calendar file — and the
 * rest sit behind it, because a guest almost always wants one of these, not all
 * of them. A confirmed stay already has the calendar file in the header, so this
 * row does not repeat it.
 */
export function ActionRow({
  v,
  hideManage = false,
}: {
  v: GuestReservation;
  /** Hide "Manage booking" when already on the manage page. */ hideManage?: boolean;
}) {
  const { checkIn, checkOut } = v.stay;
  const ready = Boolean(checkIn && checkOut);
  const event = calendarEventFor(v);
  const active =
    v.status !== 'expired' &&
    v.status !== 'payment_failed' &&
    v.status !== 'cancelled';
  const calendarInHeader =
    headerOwnsCalendar(headerKind(v), v.status) && event !== null;
  const datesLabel =
    checkIn && checkOut
      ? formatRange(checkIn, checkOut)
      : 'Dates to be confirmed';

  return (
    <section aria-label="Actions" className="print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        {active &&
          !calendarInHeader &&
          (ready ? (
            <ButtonLink
              href={bookingService.calendarUrl(v.reference)}
              download
              icon={<CalendarPlus className="size-5" aria-hidden />}
            >
              Add to calendar (.ics)
            </ButtonLink>
          ) : (
            <Button
              disabled
              icon={<CalendarPlus className="size-5" aria-hidden />}
            >
              Add to calendar (.ics)
            </Button>
          ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="secondary">
                More actions
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Also</DropdownMenuLabel>
              {active && !calendarInHeader && event && (
                <DropdownMenuLinkItem
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarPlus aria-hidden />
                  Google Calendar
                  <span className="sr-only"> (opens in a new tab)</span>
                </DropdownMenuLinkItem>
              )}
              <DropdownMenuItem
                disabled={!ready}
                onClick={() => window.print()}
              >
                <Printer aria-hidden />
                Print or save as PDF
              </DropdownMenuItem>
              <DropdownMenuLinkItem
                href={whatsappShareUrl({
                  reference: v.reference,
                  hotelName: v.hotel.name,
                  address: v.hotel.addressLines.join(', '),
                  checkIn: checkIn ?? '',
                  checkOut: checkOut ?? '',
                  datesLabel,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                Share by WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </DropdownMenuLinkItem>
              {active && !hideManage && (
                <DropdownMenuLinkItem
                  render={
                    <Link
                      href={`/booking/manage?ref=${encodeURIComponent(v.reference)}`}
                    />
                  }
                >
                  <Settings2 aria-hidden />
                  Manage booking
                </DropdownMenuLinkItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!ready && (
        <p className="mt-3 text-small text-muted-foreground">
          Calendar and print are unavailable until your check-in date is
          confirmed.
        </p>
      )}
    </section>
  );
}

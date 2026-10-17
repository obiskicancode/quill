'use client'

import { CalendarPlus, MessageCircle, Printer, Settings2 } from 'lucide-react'
import { calendarUrl } from '@/lib/booking/client'
import { googleCalendarUrl, whatsappShareUrl, type CalendarEvent } from '@/lib/booking/ics'
import type { GuestReservation } from '@/lib/booking/types'
import { formatRange } from '@/lib/room-query'
import { Button, ButtonLink } from '../ui/Button'

/** Calendar (.ics and Google), print or save as PDF, WhatsApp share, and Manage booking. */
export function ActionRow({ v, demo, hideManage = false }: { v: GuestReservation; demo: string | null; /** Hide "Manage booking" when already on the manage page. */ hideManage?: boolean }) {
  const { checkIn, checkOut } = v.stay
  const ready = Boolean(checkIn && checkOut)
  const event: CalendarEvent | null =
    checkIn && checkOut
      ? {
          reference: v.reference, hotelName: v.hotel.name, address: v.hotel.addressLines.join(', '), checkIn, checkOut,
          checkInTime: v.times.checkIn24, checkOutTime: v.times.checkOut24, timeZone: v.times.timeZone,
        }
      : null
  const active = v.status !== 'expired' && v.status !== 'payment_failed' && v.status !== 'cancelled'
  const datesLabel = checkIn && checkOut ? formatRange(checkIn, checkOut) : 'Dates to be confirmed'

  return (
    <section aria-label="Actions" className="print:hidden">
      <ul className="flex flex-wrap gap-3">
        {active && (
          <>
            <li>
              {ready && event ? (
                <ButtonLink href={calendarUrl(v.reference, demo)} variant="secondary" download icon={<CalendarPlus className="size-5" aria-hidden />}>
                  Add to calendar (.ics)
                </ButtonLink>
              ) : (
                <Button variant="secondary" disabled icon={<CalendarPlus className="size-5" aria-hidden />}>Add to calendar (.ics)</Button>
              )}
            </li>
            <li>
              {ready && event ? (
                <ButtonLink href={googleCalendarUrl(event)} external variant="secondary">
                  Google Calendar<span className="sr-only"> (opens in a new tab)</span>
                </ButtonLink>
              ) : (
                <Button variant="secondary" disabled>Google Calendar</Button>
              )}
            </li>
          </>
        )}
        <li>
          <Button variant="secondary" disabled={!ready} icon={<Printer className="size-5" aria-hidden />} onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </li>
        <li>
          <ButtonLink
            href={whatsappShareUrl({ reference: v.reference, hotelName: v.hotel.name, address: v.hotel.addressLines.join(', '), checkIn: checkIn ?? '', checkOut: checkOut ?? '', datesLabel })}
            external
            variant="secondary"
            icon={<MessageCircle className="size-5" aria-hidden />}
          >
            Share by WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </ButtonLink>
        </li>
        {active && !hideManage && (
          <li>
            <ButtonLink href={`/booking/manage?ref=${encodeURIComponent(v.reference)}`} variant="secondary" icon={<Settings2 className="size-5" aria-hidden />}>
              Manage booking
            </ButtonLink>
          </li>
        )}
      </ul>
      {!ready && <p className="mt-3 text-small text-muted">Calendar and print are unavailable until your check-in date is confirmed.</p>}
    </section>
  )
}

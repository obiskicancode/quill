/**
 * Pure helpers for downloadable `.ics` files, Google Calendar links and the
 * WhatsApp share text. They contain only booking details the guest already has.
 */

import type { CalendarEvent, GuestReservation } from '@/types/booking.types';
import type { ISODate } from '@/types/dates.types';

/** The stay as a calendar event, or null until the check-in date is confirmed. */
export function calendarEventFor(v: GuestReservation): CalendarEvent | null {
  const { checkIn, checkOut } = v.stay;
  if (!checkIn || !checkOut) return null;
  return {
    reference: v.reference,
    hotelName: v.hotel.name,
    address: v.hotel.addressLines.join(', '),
    checkIn,
    checkOut,
    checkInTime: v.times.checkIn24,
    checkOutTime: v.times.checkOut24,
    timeZone: v.times.timeZone,
  };
}

const stamp = (date: ISODate, time: string) =>
  `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

const escapeText = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** RFC 5545 line folding: lines longer than 75 octets continue on a new line starting with a space. */
function fold(line: string): string {
  const bytes = Buffer.from(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--; // never split a multi-byte character
    parts.push(bytes.subarray(start, end).toString());
    start = end;
    limit = 74;
  }
  return parts.join('\r\n ');
}

const describe = (e: CalendarEvent) =>
  [
    `Booking reference: ${e.reference}`,
    `Check-in from ${e.checkInTime}`,
    `Check-out by ${e.checkOutTime}`,
    e.guestsLabel,
  ]
    .filter(Boolean)
    .join('\n');

/**
 * Builds a complete VCALENDAR with a one-day reminder. Lines are folded per RFC
 * 5545 and the hotel timezone is emitted as a fixed standard-time block.
 */
export function buildIcs(e: CalendarEvent, now: Date = new Date()): string {
  const dtstamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hotel booking//Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Africa/Lagos has no daylight saving, so one fixed rule is enough.
    'BEGIN:VTIMEZONE',
    `TZID:${e.timeZone}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0100',
    'TZNAME:WAT',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${e.reference}@booking`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${e.timeZone}:${stamp(e.checkIn, e.checkInTime)}`,
    `DTEND;TZID=${e.timeZone}:${stamp(e.checkOut, e.checkOutTime)}`,
    `SUMMARY:${escapeText(`Stay at ${e.hotelName}`)}`,
    `LOCATION:${escapeText(`${e.hotelName}, ${e.address}`)}`,
    `DESCRIPTION:${escapeText(describe(e))}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Your stay at ${e.hotelName} starts tomorrow`)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Builds a Google Calendar "add event" URL for the stay. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Stay at ${e.hotelName}`,
    dates: `${stamp(e.checkIn, e.checkInTime)}/${stamp(e.checkOut, e.checkOutTime)}`,
    ctz: e.timeZone,
    details: describe(e),
    location: `${e.hotelName}, ${e.address}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Pre-filled WhatsApp share text: reference, dates and the hotel address. No guest contact details. */
export function whatsappShareUrl(
  e: Pick<
    CalendarEvent,
    'reference' | 'hotelName' | 'address' | 'checkIn' | 'checkOut'
  > & { datesLabel: string },
): string {
  const text = `My booking at ${e.hotelName}\nReference: ${e.reference}\nDates: ${e.datesLabel}\nAddress: ${e.address}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

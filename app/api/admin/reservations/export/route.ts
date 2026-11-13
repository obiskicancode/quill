import { NextRequest, NextResponse } from 'next/server';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import { guardAdminApi } from '@/lib/auth/guards';
import { hotelClock } from '@/lib/dates';
import {
  getReservationsAdminList,
  logExportAudit,
} from '@/lib/db/repositories/reservations.repo';
import { getHotelSettings } from '@/lib/db/repositories/settings.repo';
import { apiFail, NO_STORE_HEADERS } from '@/lib/http/envelope';
import { rateLimit } from '@/lib/rate-limit';
import { reservationsListQuerySchema } from '@/schemas/reservation.schema';

export const dynamic = 'force-dynamic';

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Formula injection defense: prevent execution of =, +, -, @
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const guard = await guardAdminApi(request, { permission: 'payments.view' });
  if (!guard.ok) return guard.response;

  // Rate limiting: 5 exports per minute per user
  const rl = await rateLimit(
    `export-reservations:${guard.context.user.id}`,
    5,
    60_000,
  );
  if (!rl.allowed) {
    return apiFail(429, ERROR_MESSAGES.EXPORT_RATE_LIMITED);
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.getAll('status');

  const rawParams = {
    q: url.searchParams.get('q') ?? undefined,
    status: statusParam.length > 0 ? statusParam : undefined,
    dateField: url.searchParams.get('dateField') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    roomTypeId: url.searchParams.get('roomTypeId') ?? undefined,
    roomId: url.searchParams.get('roomId') ?? undefined,
    source: url.searchParams.get('source') ?? undefined,
    paymentState: url.searchParams.get('paymentState') ?? undefined,
    filter: url.searchParams.get('filter') ?? undefined,
    sort: url.searchParams.get('sort') ?? 'check_in',
    order: url.searchParams.get('order') ?? 'asc',
    page: 1,
    pageSize: 10000, // Capped at 10,000 rows
  };

  const parsed = reservationsListQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiFail(
      400,
      ERROR_MESSAGES.INVALID_EXPORT_FILTERS,
      parsed.error.flatten(),
    );
  }

  const settings = await getHotelSettings();
  const timezone = settings?.timezone ?? 'Africa/Lagos';
  const clock = hotelClock(new Date(), timezone);

  try {
    const { rows, total } = await getReservationsAdminList(
      parsed.data,
      clock.today,
      true, // manager/owner can view guest contact
    );

    await logExportAudit(guard.context.user.id, rows.length, parsed.data);

    const headers = [
      'Reference',
      'Guest Name',
      'Guest Phone',
      'Guest Email',
      'Room Type',
      'Room Number',
      'Check-in',
      'Check-out',
      'Nights',
      'Adults',
      'Children',
      'Status',
      'Payment State',
      'Total (NGN)',
      'Paid (NGN)',
      'Refunded (NGN)',
      'Balance (NGN)',
      'Source',
      'Booked On',
    ];

    const lines: string[] = [];

    if (total > 10000) {
      lines.push(
        `# Note: Results capped at 10,000 of ${total} total matching reservations.`,
      );
    }

    lines.push(headers.map(escapeCsvCell).join(','));

    for (const r of rows) {
      const line = [
        r.reference,
        r.guestName,
        r.guestPhone ?? '',
        r.guestEmail ?? '',
        r.roomTypeName,
        r.roomNumber,
        r.checkIn,
        r.checkOut,
        r.nights,
        r.adults,
        r.children,
        r.status,
        r.paymentState,
        (r.totalMinor / 100).toFixed(2),
        (r.amountPaidMinor / 100).toFixed(2),
        (r.amountRefundedMinor / 100).toFixed(2),
        (r.balanceMinor / 100).toFixed(2),
        r.bookingSource,
        r.createdAt,
      ];
      lines.push(line.map(escapeCsvCell).join(','));
    }

    const csvContent = lines.join('\r\n');
    const filename = `reservations-${clock.today}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...NO_STORE_HEADERS,
      },
    });
  } catch (error) {
    console.error('Failed to export reservations CSV:', error);
    return apiFail(500, ERROR_MESSAGES.FAILED_TO_GENERATE_CSV);
  }
}

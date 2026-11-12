'use client';

import Link from 'next/link';
import { ArrowRight, Clock, UserCheck } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import {
  AdminStatusBadge,
  reservationTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatMinor } from '@/lib/format';
import type { DashboardReservationRow } from '@/types/dashboard.types';

interface ArrivalsTableProps {
  rows: DashboardReservationRow[];
  canManage: boolean;
  onCheckIn: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function ArrivalsTable({
  rows,
  canManage,
  onCheckIn,
}: ArrivalsTableProps) {
  const confirm = useConfirm();

  function askCheckIn(row: DashboardReservationRow) {
    void confirm({
      title: 'Check in guest',
      description: `Confirm check-in for ${row.guestName} (${row.reference}) in Room #${row.roomNumber}?`,
      confirmLabel: 'Confirm check-in',
      run: async () => {
        const result = await onCheckIn(row.id);
        if (!result.success) {
          throw new Error(result.error ?? ERROR_MESSAGES.CHECKIN_FAILED);
        }
      },
    });
  }

  return (
    <>
      <AdminCard
        title="Today's arrivals"
        description={`${rows.length} ${rows.length === 1 ? 'guest' : 'guests'} arriving today`}
      >
        {rows.length === 0 ? (
          <AdminEmpty title="No arrivals today">
            There are no guests scheduled to check in today.
          </AdminEmpty>
        ) : (
          <div>
            {/* Desktop Table View */}
            <Table className="hidden w-full text-left text-small md:table">
              <caption className="sr-only">
                List of guests arriving today
              </caption>
              <TableHeader className="border-b border-line text-caption font-semibold tracking-wider text-muted-foreground uppercase">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    scope="col"
                    className="pr-3 pb-3 text-muted-foreground"
                  >
                    Reference
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    Guest
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    Room
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    Stay
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    Balance
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="px-3 pb-3 text-muted-foreground"
                  >
                    ETA
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="pb-3 pl-3 text-right text-muted-foreground"
                  >
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-line">
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="transition-colors hover:bg-paper/60"
                  >
                    <TableCell className="py-3 pr-3 font-semibold">
                      <Link
                        href={`/admin/reservations/${row.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="font-medium text-ink">
                        {row.guestName}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">
                      <span>{row.roomTypeName}</span>
                      <span className="ml-1 font-semibold text-ink">
                        #{row.roomNumber}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">
                      <span>{row.nights}n</span>
                      <span className="ml-1 text-caption">
                        ({row.adults + row.children}g)
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span
                        className={
                          row.balanceMinor > 0
                            ? 'font-semibold text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatMinor(row.balanceMinor)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <AdminStatusBadge tone={reservationTone(row.status)}>
                        {statusLabel(row.status)}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">
                      {row.arrivalTime ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {row.arrivalTime}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="py-3 pl-3 text-right">
                      {canManage && row.status === 'confirmed' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={
                            <UserCheck
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          }
                          onClick={() => askCheckIn(row)}
                        >
                          Check in
                        </Button>
                      ) : (
                        <Link
                          href={`/admin/reservations/${row.id}`}
                          className="inline-flex items-center gap-1 text-caption font-semibold text-muted-foreground hover:text-ink"
                        >
                          Details
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile Card List View */}
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-control border border-line bg-paper/40 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <AdminStatusBadge tone={reservationTone(row.status)}>
                      {statusLabel(row.status)}
                    </AdminStatusBadge>
                  </div>

                  <p className="mt-1 font-medium text-ink">{row.guestName}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <span>
                      {row.roomTypeName} #{row.roomNumber}
                    </span>
                    <span>•</span>
                    <span>
                      {row.nights} nights ({row.adults + row.children} guests)
                    </span>
                    <span>•</span>
                    <span
                      className={
                        row.balanceMinor > 0
                          ? 'font-semibold text-destructive'
                          : ''
                      }
                    >
                      Due: {formatMinor(row.balanceMinor)}
                    </span>
                  </div>

                  {row.arrivalTime && (
                    <p className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      ETA: {row.arrivalTime}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-line/60 pt-2">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="inline-flex min-h-11 items-center px-3 text-caption font-semibold text-muted-foreground hover:text-ink"
                    >
                      View
                    </Link>
                    {canManage && row.status === 'confirmed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => askCheckIn(row)}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminCard>
    </>
  );
}

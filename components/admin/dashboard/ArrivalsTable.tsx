'use client';

import Link from 'next/link';
import { ArrowRight, Clock, UserCheck } from 'lucide-react';
import { useState } from 'react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { formatNaira } from '@/lib/format';
import type { DashboardReservationRow } from '@/types/dashboard.types';

import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';

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
  const [targetRow, setTargetRow] = useState<DashboardReservationRow | null>(
    null,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function handleConfirmCheckIn() {
    if (!targetRow) return;
    setIsConfirming(true);
    setDialogError(null);

    const result = await onCheckIn(targetRow.id);
    setIsConfirming(false);

    if (result.success) {
      setTargetRow(null);
    } else {
      setDialogError(result.error ?? ERROR_MESSAGES.CHECKIN_FAILED);
    }
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
            <Table className="text-small hidden w-full text-left md:table">
              <caption className="sr-only">
                List of guests arriving today
              </caption>
              <TableHeader className="border-line text-caption text-muted-foreground border-b font-semibold tracking-wider uppercase">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    scope="col"
                    className="text-muted-foreground pr-3 pb-3"
                  >
                    Reference
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    Guest
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    Room
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    Stay
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    Balance
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground px-3 pb-3"
                  >
                    ETA
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-muted-foreground pb-3 pl-3 text-right"
                  >
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-line divide-y">
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-paper/60 transition-colors"
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
                      <span className="text-ink font-medium">
                        {row.guestName}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-3 py-3">
                      <span>{row.roomTypeName}</span>
                      <span className="text-ink ml-1 font-semibold">
                        #{row.roomNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-3 py-3">
                      <span>{row.nights}n</span>
                      <span className="text-caption ml-1">
                        ({row.adults + row.children}g)
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span
                        className={
                          row.balanceMinor > 0
                            ? 'text-destructive font-semibold'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatNaira(row.balanceMinor / 100)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground px-3 py-3">
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
                          onClick={() => {
                            setDialogError(null);
                            setTargetRow(row);
                          }}
                          className="!text-caption !min-h-9 !px-2.5"
                        >
                          Check in
                        </Button>
                      ) : (
                        <Link
                          href={`/admin/reservations/${row.id}`}
                          className="text-caption text-muted-foreground hover:text-ink inline-flex items-center gap-1 font-semibold"
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
                  className="rounded-control border-line bg-paper/40 border p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="text-ink font-semibold underline-offset-4 hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <StatusBadge status={row.status} />
                  </div>

                  <p className="text-ink mt-1 font-medium">{row.guestName}</p>

                  <div className="text-caption text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                          ? 'text-destructive font-semibold'
                          : ''
                      }
                    >
                      Due: {formatNaira(row.balanceMinor / 100)}
                    </span>
                  </div>

                  {row.arrivalTime && (
                    <p className="text-caption text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" />
                      ETA: {row.arrivalTime}
                    </p>
                  )}

                  <div className="border-line/60 mt-3 flex items-center justify-end gap-2 border-t pt-2">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="text-caption text-muted-foreground hover:text-ink inline-flex min-h-11 items-center px-3 font-semibold"
                    >
                      View
                    </Link>
                    {canManage && row.status === 'confirmed' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDialogError(null);
                          setTargetRow(row);
                        }}
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

      <ConfirmDialog
        open={Boolean(targetRow)}
        title="Check in guest"
        description={`Confirm check-in for ${targetRow?.guestName} (${targetRow?.reference}) in Room #${targetRow?.roomNumber}?`}
        confirmLabel="Confirm check-in"
        isConfirming={isConfirming}
        errorMessage={dialogError}
        onConfirm={handleConfirmCheckIn}
        onCancel={() => {
          if (!isConfirming) {
            setTargetRow(null);
            setDialogError(null);
          }
        }}
      />
    </>
  );
}

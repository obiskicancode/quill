'use client';

import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
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

import { StatusBadge } from './StatusBadge';

interface DeparturesTableProps {
  rows: DashboardReservationRow[];
  canManage: boolean;
  onCheckOut: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function DeparturesTable({
  rows,
  canManage,
  onCheckOut,
}: DeparturesTableProps) {
  const confirm = useConfirm();

  function askCheckOut(row: DashboardReservationRow) {
    const balance =
      row.balanceMinor > 0
        ? ` Outstanding balance ${formatMinor(row.balanceMinor)}.`
        : '';
    void confirm({
      title: 'Check out guest',
      description: `Confirm check-out for ${row.guestName} (${row.reference}) from Room #${row.roomNumber}?${balance}`,
      confirmLabel: 'Confirm check-out',
      run: async () => {
        const result = await onCheckOut(row.id);
        if (!result.success) {
          throw new Error(result.error ?? ERROR_MESSAGES.CHECKOUT_FAILED);
        }
      },
    });
  }

  return (
    <>
      <AdminCard
        title="Today's departures"
        description={`${rows.length} ${rows.length === 1 ? 'room' : 'rooms'} scheduled for check out`}
      >
        {rows.length === 0 ? (
          <AdminEmpty title="No departures today">
            There are no guests scheduled to depart today.
          </AdminEmpty>
        ) : (
          <div>
            {/* Desktop Table View */}
            <Table className="hidden w-full text-left text-small md:table">
              <caption className="sr-only">
                List of guests departing today
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
                    Nights
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
                      {row.nights} nights
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
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="py-3 pl-3 text-right">
                      {canManage && row.status === 'checked_in' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={
                            <LogOut className="size-3.5" aria-hidden="true" />
                          }
                          onClick={() => askCheckOut(row)}
                        >
                          Check out
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
                    <StatusBadge status={row.status} />
                  </div>

                  <p className="mt-1 font-medium text-ink">{row.guestName}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <span>
                      {row.roomTypeName} #{row.roomNumber}
                    </span>
                    <span>•</span>
                    <span>{row.nights} nights</span>
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

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-line/60 pt-2">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="inline-flex min-h-11 items-center px-3 text-caption font-semibold text-muted-foreground hover:text-ink"
                    >
                      View
                    </Link>
                    {canManage && row.status === 'checked_in' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => askCheckOut(row)}
                      >
                        Check out
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

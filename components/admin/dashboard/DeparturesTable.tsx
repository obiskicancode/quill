'use client';

import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';
import { useState } from 'react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type { DashboardReservationRow } from '@/types/dashboard.types';

import { ConfirmDialog } from './ConfirmDialog';
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
  const [targetRow, setTargetRow] = useState<DashboardReservationRow | null>(
    null,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function handleConfirmCheckOut() {
    if (!targetRow) return;
    setIsConfirming(true);
    setDialogError(null);

    const result = await onCheckOut(targetRow.id);
    setIsConfirming(false);

    if (result.success) {
      setTargetRow(null);
    } else {
      setDialogError(result.error ?? 'Check-out failed');
    }
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
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="text-small hidden w-full text-left md:table">
              <caption className="sr-only">
                List of guests departing today
              </caption>
              <thead className="border-line text-caption text-muted border-b font-semibold tracking-wider uppercase">
                <tr>
                  <th scope="col" className="pr-3 pb-3">
                    Reference
                  </th>
                  <th scope="col" className="px-3 pb-3">
                    Guest
                  </th>
                  <th scope="col" className="px-3 pb-3">
                    Room
                  </th>
                  <th scope="col" className="px-3 pb-3">
                    Nights
                  </th>
                  <th scope="col" className="px-3 pb-3">
                    Balance
                  </th>
                  <th scope="col" className="px-3 pb-3">
                    Status
                  </th>
                  <th scope="col" className="pb-3 pl-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-paper/60 transition-colors"
                  >
                    <td className="py-3 pr-3 font-semibold">
                      <Link
                        href={`/admin/reservations/${row.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-ink font-medium">
                        {row.guestName}
                      </span>
                    </td>
                    <td className="text-muted px-3 py-3">
                      <span>{row.roomTypeName}</span>
                      <span className="text-ink ml-1 font-semibold">
                        #{row.roomNumber}
                      </span>
                    </td>
                    <td className="text-muted px-3 py-3">
                      {row.nights} nights
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          row.balanceMinor > 0
                            ? 'text-danger font-semibold'
                            : 'text-muted'
                        }
                      >
                        {formatNaira(row.balanceMinor / 100)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {canManage && row.status === 'checked_in' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={
                            <LogOut className="size-3.5" aria-hidden="true" />
                          }
                          onClick={() => {
                            setDialogError(null);
                            setTargetRow(row);
                          }}
                          className="!text-caption !min-h-9 !px-2.5"
                        >
                          Check out
                        </Button>
                      ) : (
                        <Link
                          href={`/admin/reservations/${row.id}`}
                          className="text-caption text-muted hover:text-ink inline-flex items-center gap-1 font-semibold"
                        >
                          Details
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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

                  <div className="text-caption text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      {row.roomTypeName} #{row.roomNumber}
                    </span>
                    <span>•</span>
                    <span>{row.nights} nights</span>
                    <span>•</span>
                    <span
                      className={
                        row.balanceMinor > 0 ? 'text-danger font-semibold' : ''
                      }
                    >
                      Due: {formatNaira(row.balanceMinor / 100)}
                    </span>
                  </div>

                  <div className="border-line/60 mt-3 flex items-center justify-end gap-2 border-t pt-2">
                    <Link
                      href={`/admin/reservations/${row.id}`}
                      className="text-caption text-muted hover:text-ink inline-flex min-h-11 items-center px-3 font-semibold"
                    >
                      View
                    </Link>
                    {canManage && row.status === 'checked_in' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDialogError(null);
                          setTargetRow(row);
                        }}
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

      <ConfirmDialog
        open={Boolean(targetRow)}
        title="Check out guest"
        description={`Confirm check-out for ${targetRow?.guestName} (${targetRow?.reference}) from Room #${targetRow?.roomNumber}? ${
          (targetRow?.balanceMinor ?? 0) > 0
            ? `Note: Outstanding balance of ${formatNaira((targetRow?.balanceMinor ?? 0) / 100)}.`
            : ''
        }`}
        confirmLabel="Confirm check-out"
        isConfirming={isConfirming}
        errorMessage={dialogError}
        onConfirm={handleConfirmCheckOut}
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

'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Columns,
  Copy,
} from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { formatNaira } from '@/lib/format';
import type {
  ReservationListItem,
  ReservationSortField,
  SortOrder,
} from '@/types/reservation.types';

import { PaymentBadge } from './PaymentBadge';

const ALL_COLUMNS = [
  { id: 'guest', label: 'Guest' },
  { id: 'room', label: 'Room' },
  { id: 'checkIn', label: 'Check-in' },
  { id: 'checkOut', label: 'Check-out' },
  { id: 'stay', label: 'Stay' },
  { id: 'status', label: 'Status' },
  { id: 'payment', label: 'Payment' },
  { id: 'total', label: 'Total' },
  { id: 'balance', label: 'Balance' },
  { id: 'source', label: 'Source' },
  { id: 'bookedOn', label: 'Booked on' },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]['id'];

interface ReservationsTableProps {
  rows: ReservationListItem[];
  sort: string;
  order: string;
  onSortChange: (field: ReservationSortField, order: SortOrder) => void;
}

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  guest: true,
  room: true,
  checkIn: true,
  checkOut: true,
  stay: true,
  status: true,
  payment: true,
  total: true,
  balance: true,
  source: true,
  bookedOn: true,
};

export function ReservationsTable({
  rows,
  sort,
  order,
  onSortChange,
}: ReservationsTableProps) {
  const router = useRouter();

  // Column visibility state persisted in localStorage
  const [visibleColumns, setVisibleColumns] = useState<
    Record<ColumnKey, boolean>
  >(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMNS;
    try {
      const stored = localStorage.getItem('admin_res_columns');
      if (stored) {
        return { ...DEFAULT_COLUMNS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_COLUMNS;
  });

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('admin_res_columns', JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  const handleCopy = (e: React.MouseEvent, ref: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef(null);
    }, 2000);
  };

  const handleSort = (field: ReservationSortField) => {
    if (sort === field) {
      onSortChange(field, order === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const renderSortIndicator = (field: ReservationSortField) => {
    if (sort !== field) {
      return (
        <ArrowUpDown className="text-muted/60 size-3" aria-hidden="true" />
      );
    }
    return order === 'asc' ? (
      <ArrowUp className="text-ink size-3" aria-hidden="true" />
    ) : (
      <ArrowDown className="text-ink size-3" aria-hidden="true" />
    );
  };

  const getAriaSort = (
    field: ReservationSortField,
  ): 'ascending' | 'descending' | 'none' => {
    if (sort !== field) return 'none';
    return order === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="rounded-card border-line bg-surface shadow-raised relative border">
      {/* Table Toolbar Header */}
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <span className="text-caption text-muted font-semibold tracking-wider uppercase">
          Reservations inventory ({rows.length} records)
        </span>

        {/* Column Visibility Menu Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setColumnMenuOpen(!columnMenuOpen)}
            aria-expanded={columnMenuOpen}
            aria-label="Customize visible columns"
            className="rounded-control border-line bg-paper text-caption text-muted hover:text-ink inline-flex min-h-8 items-center gap-1.5 border px-2.5 font-semibold transition-colors"
          >
            <Columns className="size-3.5" aria-hidden="true" />
            <span>Columns</span>
          </button>

          {columnMenuOpen && (
            <div className="rounded-card border-line bg-surface shadow-float absolute top-10 right-0 z-30 w-52 border p-2">
              <p className="text-caption text-muted px-2 py-1 font-bold uppercase">
                Toggle Columns
              </p>
              <div className="space-y-1">
                {ALL_COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className="rounded-control text-small text-ink hover:bg-paper flex w-full items-center justify-between px-2 py-1.5 text-left transition-colors"
                  >
                    <span>{col.label}</span>
                    {visibleColumns[col.id] && (
                      <Check
                        className="text-accent size-3.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Scroll Container */}
      <div className="overflow-x-auto">
        <table className="text-small w-full border-collapse text-left">
          <caption className="sr-only">List of hotel reservations</caption>
          <thead className="border-line bg-paper/90 text-caption text-muted sticky top-0 z-10 border-b font-semibold tracking-wider uppercase backdrop-blur">
            <tr>
              {/* Reference (Sticky Left on Scroll) */}
              <th
                scope="col"
                className="bg-paper sticky left-0 z-20 py-3.5 pr-3 pl-4 shadow-[1px_0_0_0_rgb(var(--color-line))]"
              >
                Reference
              </th>

              {visibleColumns.guest && (
                <th
                  scope="col"
                  aria-sort={getAriaSort('guest_name')}
                  className="px-3 py-3.5"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('guest_name')}
                    className="text-muted hover:text-ink inline-flex items-center gap-1 font-semibold uppercase"
                  >
                    Guest
                    {renderSortIndicator('guest_name')}
                  </button>
                </th>
              )}

              {visibleColumns.room && (
                <th scope="col" className="px-3 py-3.5">
                  Room
                </th>
              )}

              {visibleColumns.checkIn && (
                <th
                  scope="col"
                  aria-sort={getAriaSort('check_in')}
                  className="px-3 py-3.5"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('check_in')}
                    className="text-muted hover:text-ink inline-flex items-center gap-1 font-semibold uppercase"
                  >
                    Check-in
                    {renderSortIndicator('check_in')}
                  </button>
                </th>
              )}

              {visibleColumns.checkOut && (
                <th scope="col" className="px-3 py-3.5">
                  Check-out
                </th>
              )}

              {visibleColumns.stay && (
                <th scope="col" className="px-3 py-3.5">
                  Stay
                </th>
              )}

              {visibleColumns.status && (
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
              )}

              {visibleColumns.payment && (
                <th scope="col" className="px-3 py-3.5">
                  Payment
                </th>
              )}

              {visibleColumns.total && (
                <th
                  scope="col"
                  aria-sort={getAriaSort('total_minor')}
                  className="px-3 py-3.5"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('total_minor')}
                    className="text-muted hover:text-ink inline-flex items-center gap-1 font-semibold uppercase"
                  >
                    Total
                    {renderSortIndicator('total_minor')}
                  </button>
                </th>
              )}

              {visibleColumns.balance && (
                <th scope="col" className="px-3 py-3.5">
                  Balance due
                </th>
              )}

              {visibleColumns.source && (
                <th scope="col" className="px-3 py-3.5">
                  Source
                </th>
              )}

              {visibleColumns.bookedOn && (
                <th
                  scope="col"
                  aria-sort={getAriaSort('created_at')}
                  className="py-3.5 pr-4 pl-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="text-muted hover:text-ink inline-flex items-center gap-1 font-semibold uppercase"
                  >
                    Booked on
                    {renderSortIndicator('created_at')}
                  </button>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-line divide-y">
            {rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                role="button"
                aria-label={`Open reservation ${row.reference} for ${row.guestName}`}
                onClick={() => router.push(`/admin/reservations/${row.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/admin/reservations/${row.id}`);
                  }
                }}
                className="group hover:bg-paper/70 focus:bg-paper/70 cursor-pointer transition-colors focus:outline-none"
              >
                {/* Reference Column (Sticky Left) */}
                <td className="bg-surface text-ink group-hover:bg-paper/70 group-focus:bg-paper/70 sticky left-0 z-10 py-3 pr-3 pl-4 font-semibold shadow-[1px_0_0_0_rgb(var(--color-line))]">
                  <div className="flex items-center gap-1.5">
                    <span className="underline-offset-4 group-hover:underline">
                      {row.reference}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, row.reference)}
                      aria-label={`Copy reference ${row.reference}`}
                      className="rounded-control text-muted hover:bg-line/40 hover:text-ink p-1 focus:outline-none"
                    >
                      {copiedRef === row.reference ? (
                        <Check
                          className="text-success size-3"
                          aria-hidden="true"
                        />
                      ) : (
                        <Copy className="size-3" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>

                {visibleColumns.guest && (
                  <td className="px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-ink truncate font-medium">
                        {row.guestName}
                      </p>
                      {row.guestPhone && (
                        <p className="text-caption text-muted truncate">
                          {row.guestPhone}
                        </p>
                      )}
                    </div>
                  </td>
                )}

                {visibleColumns.room && (
                  <td className="text-muted px-3 py-3">
                    <span>{row.roomTypeName}</span>
                    <span className="text-ink ml-1 font-semibold">
                      #{row.roomNumber}
                    </span>
                  </td>
                )}

                {visibleColumns.checkIn && (
                  <td className="text-ink px-3 py-3 font-medium">
                    {row.checkIn}
                  </td>
                )}

                {visibleColumns.checkOut && (
                  <td className="text-muted px-3 py-3">{row.checkOut}</td>
                )}

                {visibleColumns.stay && (
                  <td className="text-muted px-3 py-3">
                    <span>{row.nights}n</span>
                    <span className="text-caption ml-1">
                      ({row.adults + row.children}g)
                    </span>
                  </td>
                )}

                {visibleColumns.status && (
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                )}

                {visibleColumns.payment && (
                  <td className="px-3 py-3">
                    <PaymentBadge state={row.paymentState} />
                  </td>
                )}

                {visibleColumns.total && (
                  <td className="text-ink px-3 py-3 font-semibold">
                    {formatNaira(row.totalMinor / 100)}
                  </td>
                )}

                {visibleColumns.balance && (
                  <td className="px-3 py-3">
                    <span
                      className={
                        row.balanceMinor > 0
                          ? 'text-danger font-bold'
                          : 'text-muted'
                      }
                    >
                      {formatNaira(row.balanceMinor / 100)}
                    </span>
                  </td>
                )}

                {visibleColumns.source && (
                  <td className="text-caption text-muted px-3 py-3 font-medium uppercase">
                    {row.bookingSource}
                  </td>
                )}

                {visibleColumns.bookedOn && (
                  <td className="text-caption text-muted py-3 pr-4 pl-3">
                    {row.createdAt.slice(0, 10)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

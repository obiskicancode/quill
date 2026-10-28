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
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWebStorage } from '@/hooks/use-web-storage';
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

const serializeColumns = (value: Record<ColumnKey, boolean>) =>
  JSON.stringify(value);

const deserializeColumns = (raw: string): Record<ColumnKey, boolean> => {
  const stored = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
  return { ...DEFAULT_COLUMNS, ...stored };
};

export function ReservationsTable({
  rows,
  sort,
  order,
  onSortChange,
}: ReservationsTableProps) {
  const router = useRouter();

  // Column visibility state persisted in localStorage
  const [visibleColumns, setVisibleColumns] = useWebStorage<
    Record<ColumnKey, boolean>
  >(
    'localStorage',
    'admin_res_columns',
    DEFAULT_COLUMNS,
    serializeColumns,
    deserializeColumns,
  );

  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <ArrowUpDown
          className="text-muted-foreground/60 size-3"
          aria-hidden="true"
        />
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
    <div className="rounded-card border-line bg-card shadow-raised relative border">
      {/* Table Toolbar Header */}
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <span className="text-caption text-muted-foreground font-semibold tracking-wider uppercase">
          Reservations inventory ({rows.length} records)
        </span>

        {/* Column Visibility Menu Button */}
        <Popover>
          <PopoverTrigger
            aria-label="Customize visible columns"
            className="rounded-control border-line bg-paper text-caption text-muted-foreground hover:text-ink focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 border px-2.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Columns className="size-3.5" aria-hidden="true" />
            <span>Columns</span>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-52 p-2">
            <p className="text-caption text-muted-foreground px-2 py-1 font-bold uppercase">
              Toggle Columns
            </p>
            <div className="space-y-1">
              {ALL_COLUMNS.map((col) => (
                <Button
                  key={col.id}
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleColumn(col.id)}
                  className="w-full justify-between"
                >
                  <span>{col.label}</span>
                  {visibleColumns[col.id] && (
                    <Check
                      className="text-primary size-3.5"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Table Scroll Container */}
      <Table>
        <caption className="sr-only">List of hotel reservations</caption>
        <TableHeader className="border-line bg-paper/90 text-caption text-muted-foreground sticky top-0 z-10 border-b font-semibold tracking-wider uppercase backdrop-blur">
          <TableRow className="border-line hover:bg-transparent">
            {/* Reference (Sticky Left on Scroll) */}
            <TableHead
              scope="col"
              className="bg-paper text-muted-foreground sticky left-0 z-20 py-3.5 pr-3 pl-4 shadow-[0.0625rem_0_0_0_rgb(var(--color-line))]"
            >
              Reference
            </TableHead>

            {visibleColumns.guest && (
              <TableHead
                scope="col"
                aria-sort={getAriaSort('guest_name')}
                className="px-3 py-3.5"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('guest_name')}
                  className="h-auto p-0 font-semibold uppercase hover:bg-transparent"
                >
                  Guest
                  {renderSortIndicator('guest_name')}
                </Button>
              </TableHead>
            )}

            {visibleColumns.room && (
              <TableHead scope="col" className="px-3 py-3.5">
                Room
              </TableHead>
            )}

            {visibleColumns.checkIn && (
              <TableHead
                scope="col"
                aria-sort={getAriaSort('check_in')}
                className="px-3 py-3.5"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('check_in')}
                  className="h-auto p-0 font-semibold uppercase hover:bg-transparent"
                >
                  Check-in
                  {renderSortIndicator('check_in')}
                </Button>
              </TableHead>
            )}

            {visibleColumns.checkOut && (
              <TableHead scope="col" className="px-3 py-3.5">
                Check-out
              </TableHead>
            )}

            {visibleColumns.stay && (
              <TableHead scope="col" className="px-3 py-3.5">
                Stay
              </TableHead>
            )}

            {visibleColumns.status && (
              <TableHead scope="col" className="px-3 py-3.5">
                Status
              </TableHead>
            )}

            {visibleColumns.payment && (
              <TableHead scope="col" className="px-3 py-3.5">
                Payment
              </TableHead>
            )}

            {visibleColumns.total && (
              <TableHead
                scope="col"
                aria-sort={getAriaSort('total_minor')}
                className="px-3 py-3.5"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('total_minor')}
                  className="h-auto p-0 font-semibold uppercase hover:bg-transparent"
                >
                  Total
                  {renderSortIndicator('total_minor')}
                </Button>
              </TableHead>
            )}

            {visibleColumns.balance && (
              <TableHead scope="col" className="px-3 py-3.5">
                Balance due
              </TableHead>
            )}

            {visibleColumns.source && (
              <TableHead scope="col" className="px-3 py-3.5">
                Source
              </TableHead>
            )}

            {visibleColumns.bookedOn && (
              <TableHead
                scope="col"
                aria-sort={getAriaSort('created_at')}
                className="py-3.5 pr-4 pl-3"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleSort('created_at')}
                  className="h-auto p-0 font-semibold uppercase hover:bg-transparent"
                >
                  Booked on
                  {renderSortIndicator('created_at')}
                </Button>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody className="divide-line divide-y">
          {rows.map((row) => (
            <TableRow
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
              className="group hover:bg-paper/70 focus:bg-paper/70 border-line cursor-pointer transition-colors focus:outline-none"
            >
              {/* Reference Column (Sticky Left) */}
              <TableCell className="bg-card text-ink group-hover:bg-paper/70 group-focus:bg-paper/70 sticky left-0 z-10 py-3 pr-3 pl-4 font-semibold shadow-[0.0625rem_0_0_0_rgb(var(--color-line))]">
                <div className="flex items-center gap-1.5">
                  <span className="underline-offset-4 group-hover:underline">
                    {row.reference}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => handleCopy(e, row.reference)}
                    aria-label={`Copy reference ${row.reference}`}
                    className="text-muted-foreground hover:bg-line/40 hover:text-ink p-1"
                  >
                    {copiedRef === row.reference ? (
                      <Check
                        className="text-success size-3"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </TableCell>

              {visibleColumns.guest && (
                <TableCell className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-ink truncate font-medium">
                      {row.guestName}
                    </p>
                    {row.guestPhone && (
                      <p className="text-caption text-muted-foreground truncate">
                        {row.guestPhone}
                      </p>
                    )}
                  </div>
                </TableCell>
              )}

              {visibleColumns.room && (
                <TableCell className="text-muted-foreground px-3 py-3">
                  <span>{row.roomTypeName}</span>
                  <span className="text-ink ml-1 font-semibold">
                    #{row.roomNumber}
                  </span>
                </TableCell>
              )}

              {visibleColumns.checkIn && (
                <TableCell className="text-ink px-3 py-3 font-medium">
                  {row.checkIn}
                </TableCell>
              )}

              {visibleColumns.checkOut && (
                <TableCell className="text-muted-foreground px-3 py-3">
                  {row.checkOut}
                </TableCell>
              )}

              {visibleColumns.stay && (
                <TableCell className="text-muted-foreground px-3 py-3">
                  <span>{row.nights}n</span>
                  <span className="text-caption ml-1">
                    ({row.adults + row.children}g)
                  </span>
                </TableCell>
              )}

              {visibleColumns.status && (
                <TableCell className="px-3 py-3">
                  <StatusBadge status={row.status} />
                </TableCell>
              )}

              {visibleColumns.payment && (
                <TableCell className="px-3 py-3">
                  <PaymentBadge state={row.paymentState} />
                </TableCell>
              )}

              {visibleColumns.total && (
                <TableCell className="text-ink px-3 py-3 font-semibold">
                  {formatNaira(row.totalMinor / 100)}
                </TableCell>
              )}

              {visibleColumns.balance && (
                <TableCell className="px-3 py-3">
                  <span
                    className={
                      row.balanceMinor > 0
                        ? 'text-destructive font-bold'
                        : 'text-muted-foreground'
                    }
                  >
                    {formatNaira(row.balanceMinor / 100)}
                  </span>
                </TableCell>
              )}

              {visibleColumns.source && (
                <TableCell className="text-caption text-muted-foreground px-3 py-3 font-medium uppercase">
                  {row.bookingSource}
                </TableCell>
              )}

              {visibleColumns.bookedOn && (
                <TableCell className="text-caption text-muted-foreground py-3 pr-4 pl-3">
                  {row.createdAt.slice(0, 10)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

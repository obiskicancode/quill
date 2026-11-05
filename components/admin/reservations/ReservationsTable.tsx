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

import { clickableRowProps } from '@/components/admin/clickableRow';
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
import { formatMinor } from '@/lib/format';
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
          className="size-3 text-muted-foreground/60"
          aria-hidden="true"
        />
      );
    }
    return order === 'asc' ? (
      <ArrowUp className="size-3 text-ink" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3 text-ink" aria-hidden="true" />
    );
  };

  const getAriaSort = (
    field: ReservationSortField,
  ): 'ascending' | 'descending' | 'none' => {
    if (sort !== field) return 'none';
    return order === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="relative rounded-card border border-line bg-card shadow-raised">
      {/* Table Toolbar Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-caption font-semibold tracking-wider text-muted-foreground uppercase">
          Reservations inventory ({rows.length} records)
        </span>

        {/* Column Visibility Menu Button */}
        <Popover>
          <PopoverTrigger
            aria-label="Customize visible columns"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-line bg-paper px-2.5 text-caption font-semibold text-muted-foreground transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Columns className="size-3.5" aria-hidden="true" />
            <span>Columns</span>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-52 p-2">
            <p className="px-2 py-1 text-caption font-bold text-muted-foreground uppercase">
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
                      className="size-3.5 text-primary"
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
        <TableHeader className="sticky top-0 z-10 border-b border-line bg-paper/90 text-caption font-semibold tracking-wider text-muted-foreground uppercase backdrop-blur">
          <TableRow className="border-line hover:bg-transparent">
            {/* Reference (Sticky Left on Scroll) */}
            <TableHead
              scope="col"
              className="sticky left-0 z-20 bg-paper py-3.5 pr-3 pl-4 text-muted-foreground shadow-[0.0625rem_0_0_0_var(--color-line)]"
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

        <TableBody className="divide-y divide-line">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              {...clickableRowProps(
                `Open reservation ${row.reference} for ${row.guestName}`,
                () => router.push(`/admin/reservations/${row.id}`),
                'group border-line transition-colors hover:bg-paper/70 focus:bg-paper/70',
              )}
            >
              {/* Reference Column (Sticky Left) */}
              <TableCell className="sticky left-0 z-10 bg-card py-3 pr-3 pl-4 font-semibold text-ink shadow-[0.0625rem_0_0_0_var(--color-line)] group-hover:bg-paper/70 group-focus:bg-paper/70">
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
                    className="p-1 text-muted-foreground hover:bg-line/40 hover:text-ink"
                  >
                    {copiedRef === row.reference ? (
                      <Check
                        className="size-3 text-success"
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
                    <p className="truncate font-medium text-ink">
                      {row.guestName}
                    </p>
                    {row.guestPhone && (
                      <p className="truncate text-caption text-muted-foreground">
                        {row.guestPhone}
                      </p>
                    )}
                  </div>
                </TableCell>
              )}

              {visibleColumns.room && (
                <TableCell className="px-3 py-3 text-muted-foreground">
                  <span>{row.roomTypeName}</span>
                  <span className="ml-1 font-semibold text-ink">
                    #{row.roomNumber}
                  </span>
                </TableCell>
              )}

              {visibleColumns.checkIn && (
                <TableCell className="px-3 py-3 font-medium text-ink">
                  {row.checkIn}
                </TableCell>
              )}

              {visibleColumns.checkOut && (
                <TableCell className="px-3 py-3 text-muted-foreground">
                  {row.checkOut}
                </TableCell>
              )}

              {visibleColumns.stay && (
                <TableCell className="px-3 py-3 text-muted-foreground">
                  <span>{row.nights}n</span>
                  <span className="ml-1 text-caption">
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
                <TableCell className="px-3 py-3 font-semibold text-ink">
                  {formatMinor(row.totalMinor)}
                </TableCell>
              )}

              {visibleColumns.balance && (
                <TableCell className="px-3 py-3">
                  <span
                    className={
                      row.balanceMinor > 0
                        ? 'font-bold text-destructive'
                        : 'text-muted-foreground'
                    }
                  >
                    {formatMinor(row.balanceMinor)}
                  </span>
                </TableCell>
              )}

              {visibleColumns.source && (
                <TableCell className="px-3 py-3 text-caption font-medium text-muted-foreground uppercase">
                  {row.bookingSource}
                </TableCell>
              )}

              {visibleColumns.bookedOn && (
                <TableCell className="py-3 pr-4 pl-3 text-caption text-muted-foreground">
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

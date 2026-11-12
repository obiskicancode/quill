'use client';

import Link from 'next/link';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import {
  AdminStatusBadge,
  paymentRecordTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { clickableRowProps } from '@/components/admin/clickableRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatHotelDate, formatMinorExact } from '@/lib/format';
import type { PaymentListItem } from '@/types/payments.types';

export function PaymentsTable({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
}: {
  items: PaymentListItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (payment: PaymentListItem) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isAllSelected =
    items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-card md:block">
        <Table className="w-full text-left text-small">
          <caption className="sr-only">
            Payments and transactions register
          </caption>
          <TableHeader className="sticky top-0 z-10 border-b border-line bg-paper text-caption font-semibold text-muted-foreground uppercase">
            <TableRow className="border-line hover:bg-transparent">
              <TableHead scope="col" className="w-10 px-4 py-3">
                <Checkbox
                  aria-label="Select all payments on this page"
                  checked={isAllSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Date
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Booking Ref
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Guest
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Type
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Method
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Status
              </TableHead>
              <TableHead scope="col" className="px-3 py-3 text-right">
                Amount (₦)
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Provider Ref
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Reconciliation
              </TableHead>
              <TableHead scope="col" className="px-3 py-3">
                Recorded By
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-line">
            {items.map((payment) => {
              const isSelected = selectedIds.includes(payment.id);
              const isRefund = payment.type === 'refund';

              return (
                <TableRow
                  key={payment.id}
                  {...clickableRowProps(
                    `Open payment ${payment.reference}`,
                    () => onRowClick(payment),
                    `border-line transition-colors hover:bg-paper/80 ${
                      isSelected ? 'bg-primary/5' : ''
                    }`,
                  )}
                >
                  <TableCell
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      aria-label={`Select payment ${payment.reference}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(payment.id)}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 text-caption whitespace-nowrap text-muted-foreground">
                    {formatHotelDate(payment.createdAt)}
                  </TableCell>
                  <TableCell className="px-3 py-3 font-mono font-medium text-ink">
                    <Link
                      href={`/admin/reservations/${payment.reservationId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
                    >
                      {payment.reservationRef}
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="max-w-35 truncate font-medium text-ink">
                      {payment.guestName}
                    </div>
                    <div className="max-w-35 truncate text-caption text-muted-foreground">
                      {payment.guestEmail}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge variant="outline" className="capitalize">
                      {payment.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="text-caption font-medium text-ink capitalize">
                      {payment.method.replace('_', ' ')}
                    </div>
                    <div className="text-micro text-muted-foreground capitalize">
                      {payment.provider}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <AdminStatusBadge
                      tone={paymentRecordTone(payment.status)}
                      className="text-micro"
                    >
                      {statusLabel(payment.status)}
                    </AdminStatusBadge>
                  </TableCell>
                  <TableCell
                    className={`px-3 py-3 text-right font-mono font-medium ${isRefund ? 'text-destructive' : 'text-ink'}`}
                  >
                    {isRefund
                      ? `-${formatMinorExact(payment.amountMinor)}`
                      : formatMinorExact(payment.amountMinor)}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {payment.providerRef ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) =>
                          handleCopy(e, payment.providerRef!, payment.id)
                        }
                        className="inline-flex h-auto items-center gap-1 p-0 font-mono text-caption text-muted-foreground hover:text-foreground"
                        title="Click to copy provider reference"
                      >
                        <span className="max-w-25 truncate">
                          {payment.providerRef}
                        </span>
                        {copiedId === payment.id ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-caption text-muted-foreground italic">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {payment.reconciled ? (
                      <span className="inline-flex items-center gap-1 text-micro font-medium text-success">
                        <ShieldCheck className="size-3.5" /> Reconciled
                      </span>
                    ) : (
                      <Badge variant="neutral" className="text-micro">
                        Unreconciled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-30 truncate px-3 py-3 text-caption text-muted-foreground">
                    {payment.recordedByName || payment.provider}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {items.map((payment) => {
          const isSelected = selectedIds.includes(payment.id);
          const isRefund = payment.type === 'refund';

          return (
            <div
              key={payment.id}
              {...clickableRowProps(
                `Open payment ${payment.reference}`,
                () => onRowClick(payment),
                `rounded-card border border-line bg-card p-4 shadow-raised transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                }`,
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select payment ${payment.reference}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(payment.id)}
                    />
                  </div>
                  <span className="font-mono font-medium text-ink">
                    {payment.reservationRef}
                  </span>
                </div>
                <AdminStatusBadge tone={paymentRecordTone(payment.status)}>
                  {statusLabel(payment.status)}
                </AdminStatusBadge>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-small text-muted-foreground">
                  {payment.guestName}
                </span>
                <span
                  className={`font-mono text-small font-bold ${isRefund ? 'text-destructive' : 'text-ink'}`}
                >
                  {isRefund
                    ? `-${formatMinorExact(payment.amountMinor)}`
                    : formatMinorExact(payment.amountMinor)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-line/60 pt-2 text-caption text-muted-foreground">
                <span>
                  {payment.method.replace('_', ' ')} ({payment.provider})
                </span>
                <span>
                  {payment.reconciled ? (
                    <span className="font-medium text-success">Reconciled</span>
                  ) : (
                    <span>Unreconciled</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

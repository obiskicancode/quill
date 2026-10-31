'use client';

import Link from 'next/link';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

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
import type { PaymentListItem } from '@/types/payments.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

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
      <div className="rounded-card border-line bg-card hidden overflow-x-auto border md:block">
        <Table className="text-small w-full text-left">
          <caption className="sr-only">
            Payments and transactions register
          </caption>
          <TableHeader className="border-line bg-paper text-caption text-muted-foreground sticky top-0 z-10 border-b font-semibold uppercase">
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
          <TableBody className="divide-line divide-y">
            {items.map((payment) => {
              const isSelected = selectedIds.includes(payment.id);
              const isRefund = payment.type === 'refund';

              return (
                <TableRow
                  key={payment.id}
                  onClick={() => onRowClick(payment)}
                  className={`hover:bg-paper/80 border-line cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
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
                  <TableCell className="text-muted-foreground text-caption px-3 py-3 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-ink px-3 py-3 font-mono font-medium">
                    <Link
                      href={`/admin/reservations/${payment.reservationId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      {payment.reservationRef}
                      <ExternalLink className="text-muted-foreground size-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="text-ink max-w-35 truncate font-medium">
                      {payment.guestName}
                    </div>
                    <div className="text-caption text-muted-foreground max-w-35 truncate">
                      {payment.guestEmail}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge
                      variant="outline"
                      className="text-caption font-medium capitalize"
                    >
                      {payment.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="text-ink text-caption font-medium capitalize">
                      {payment.method.replace('_', ' ')}
                    </div>
                    <div className="text-muted-foreground text-[0.6875rem] capitalize">
                      {payment.provider}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[0.6875rem] font-semibold ${
                        payment.status === 'paid'
                          ? 'bg-success/10 text-success border-success/20'
                          : payment.status === 'pending'
                            ? 'border-primary/30 bg-primary/15 text-brand-ink'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`px-3 py-3 text-right font-mono font-medium ${isRefund ? 'text-destructive' : 'text-ink'}`}
                  >
                    {isRefund
                      ? `-${formatNaira(payment.amountMinor)}`
                      : formatNaira(payment.amountMinor)}
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
                        className="text-caption text-muted-foreground hover:text-foreground inline-flex h-auto items-center gap-1 p-0 font-mono"
                        title="Click to copy provider reference"
                      >
                        <span className="max-w-25 truncate">
                          {payment.providerRef}
                        </span>
                        {copiedId === payment.id ? (
                          <Check className="text-success size-3" />
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
                      <span className="text-success inline-flex items-center gap-1 text-[0.6875rem] font-medium">
                        <ShieldCheck className="size-3.5" /> Reconciled
                      </span>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted/10 text-muted-foreground text-[0.6875rem]"
                      >
                        Unreconciled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-caption text-muted-foreground max-w-30 truncate px-3 py-3">
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
              onClick={() => onRowClick(payment)}
              className={`rounded-card border-line bg-card border p-4 shadow-sm transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : ''
              }`}
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
                  <span className="text-ink font-mono font-medium">
                    {payment.reservationRef}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-caption font-semibold ${
                    payment.status === 'paid'
                      ? 'bg-success/10 text-success border-success/20'
                      : payment.status === 'pending'
                        ? 'border-primary/30 bg-primary/15 text-brand-ink'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  {payment.status}
                </Badge>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-small text-muted-foreground">
                  {payment.guestName}
                </span>
                <span
                  className={`text-small font-mono font-bold ${isRefund ? 'text-destructive' : 'text-ink'}`}
                >
                  {isRefund
                    ? `-${formatNaira(payment.amountMinor)}`
                    : formatNaira(payment.amountMinor)}
                </span>
              </div>

              <div className="border-line/60 text-caption text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-1 border-t pt-2">
                <span>
                  {payment.method.replace('_', ' ')} ({payment.provider})
                </span>
                <span>
                  {payment.reconciled ? (
                    <span className="text-success font-medium">Reconciled</span>
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

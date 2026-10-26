'use client';

import Link from 'next/link';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import type { PaymentListItem } from '@/types/payments-admin.types';

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
      <div className="rounded-card border-line bg-surface hidden overflow-x-auto border md:block">
        <table className="text-small w-full text-left">
          <caption className="sr-only">
            Payments and transactions register
          </caption>
          <thead className="border-line bg-paper text-caption text-muted sticky top-0 z-10 border-b font-semibold uppercase">
            <tr>
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all payments on this page"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="border-line text-primary focus:ring-primary size-4 rounded"
                />
              </th>
              <th scope="col" className="px-3 py-3">
                Date
              </th>
              <th scope="col" className="px-3 py-3">
                Booking Ref
              </th>
              <th scope="col" className="px-3 py-3">
                Guest
              </th>
              <th scope="col" className="px-3 py-3">
                Type
              </th>
              <th scope="col" className="px-3 py-3">
                Method
              </th>
              <th scope="col" className="px-3 py-3">
                Status
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Amount (₦)
              </th>
              <th scope="col" className="px-3 py-3">
                Provider Ref
              </th>
              <th scope="col" className="px-3 py-3">
                Reconciliation
              </th>
              <th scope="col" className="px-3 py-3">
                Recorded By
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {items.map((payment) => {
              const isSelected = selectedIds.includes(payment.id);
              const isRefund = payment.type === 'refund';

              return (
                <tr
                  key={payment.id}
                  onClick={() => onRowClick(payment)}
                  className={`hover:bg-paper/80 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select payment ${payment.reference}`}
                      checked={isSelected}
                      onChange={() => onToggleSelect(payment.id)}
                      className="border-line text-primary focus:ring-primary size-4 rounded"
                    />
                  </td>
                  <td className="text-muted text-caption px-3 py-3 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="text-ink px-3 py-3 font-mono font-medium">
                    <Link
                      href={`/admin/reservations/${payment.reservationId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      {payment.reservationRef}
                      <ExternalLink className="text-muted size-3" />
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-ink max-w-[140px] truncate font-medium">
                      {payment.guestName}
                    </div>
                    <div className="text-caption text-muted max-w-[140px] truncate">
                      {payment.guestEmail}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-caption bg-paper border-line rounded border px-2 py-0.5 capitalize">
                      {payment.type}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-ink text-caption font-medium capitalize">
                      {payment.method.replace('_', ' ')}
                    </div>
                    <div className="text-muted text-[11px] capitalize">
                      {payment.provider}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        payment.status === 'paid'
                          ? 'bg-success/10 text-success border-success/20'
                          : payment.status === 'pending'
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                            : 'bg-danger/10 text-danger border-danger/20'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-mono font-medium ${isRefund ? 'text-danger' : 'text-ink'}`}
                  >
                    {isRefund
                      ? `-${formatNaira(payment.amountMinor)}`
                      : formatNaira(payment.amountMinor)}
                  </td>
                  <td className="px-3 py-3">
                    {payment.providerRef ? (
                      <button
                        type="button"
                        onClick={(e) =>
                          handleCopy(e, payment.providerRef!, payment.id)
                        }
                        className="text-caption text-muted hover:text-ink inline-flex items-center gap-1 font-mono"
                        title="Click to copy provider reference"
                      >
                        <span className="max-w-[100px] truncate">
                          {payment.providerRef}
                        </span>
                        {copiedId === payment.id ? (
                          <Check className="text-success size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    ) : (
                      <span className="text-caption text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {payment.reconciled ? (
                      <span className="text-success inline-flex items-center gap-1 text-[11px] font-medium">
                        <ShieldCheck className="size-3.5" /> Reconciled
                      </span>
                    ) : (
                      <span className="bg-muted/10 text-muted inline-flex items-center rounded px-1.5 py-0.5 text-[11px]">
                        Unreconciled
                      </span>
                    )}
                  </td>
                  <td className="text-caption text-muted max-w-[120px] truncate px-3 py-3">
                    {payment.recordedByName || payment.provider}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
              className={`rounded-card border-line bg-surface border p-4 shadow-sm transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Select payment ${payment.reference}`}
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(payment.id)}
                    className="border-line text-primary focus:ring-primary size-4 rounded"
                  />
                  <span className="text-ink font-mono font-medium">
                    {payment.reservationRef}
                  </span>
                </div>
                <span
                  className={`text-caption inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${
                    payment.status === 'paid'
                      ? 'bg-success/10 text-success border-success/20'
                      : payment.status === 'pending'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                        : 'bg-danger/10 text-danger border-danger/20'
                  }`}
                >
                  {payment.status}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-small text-muted">
                  {payment.guestName}
                </span>
                <span
                  className={`text-small font-mono font-bold ${isRefund ? 'text-danger' : 'text-ink'}`}
                >
                  {isRefund
                    ? `-${formatNaira(payment.amountMinor)}`
                    : formatNaira(payment.amountMinor)}
                </span>
              </div>

              <div className="border-line/60 text-caption text-muted mt-2 flex flex-wrap items-center justify-between gap-1 border-t pt-2">
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

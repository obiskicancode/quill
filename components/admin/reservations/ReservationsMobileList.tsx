'use client';

import { useRouter } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { clickableRowProps } from '@/components/admin/clickableRow';
import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatMinor } from '@/lib/format';
import type { ReservationListItem } from '@/types/reservation.types';

import { PaymentBadge } from './PaymentBadge';

export function ReservationsMobileList({
  rows,
}: {
  rows: ReservationListItem[];
}) {
  const router = useRouter();
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, ref: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => {
      setCopiedRef(null);
    }, 2000);
  };

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div
          key={row.id}
          {...clickableRowProps(
            `Open reservation ${row.reference}`,
            () => router.push(`/admin/reservations/${row.id}`),
            'rounded-card border border-line bg-card p-4 shadow-raised transition-all active:scale-[0.99]',
          )}
        >
          {/* Header row: Reference & Copy & Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <span>{row.reference}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => handleCopy(e, row.reference)}
                aria-label={`Copy reference ${row.reference}`}
              >
                {copiedRef === row.reference ? (
                  <Check className="size-3 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="size-3" aria-hidden="true" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <StatusBadge status={row.status} />
              <PaymentBadge state={row.paymentState} />
            </div>
          </div>

          {/* Guest Name & Room info */}
          <div className="mt-2.5">
            <p className="font-semibold text-ink">{row.guestName}</p>
            {row.guestPhone && (
              <p className="text-caption text-muted-foreground">
                {row.guestPhone}
              </p>
            )}
            <p className="mt-1 text-caption text-muted-foreground">
              {row.roomTypeName} • Room #{row.roomNumber}
            </p>
          </div>

          {/* Stay Dates and Financials */}
          <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 text-caption">
            <div>
              <span className="font-medium text-ink">
                {row.checkIn} → {row.checkOut}
              </span>
              <span className="ml-1 text-muted-foreground">
                ({row.nights}n)
              </span>
            </div>

            <div>
              <span className="mr-1.5 text-muted-foreground">Balance:</span>
              <span
                className={
                  row.balanceMinor > 0
                    ? 'font-bold text-destructive'
                    : 'text-ink'
                }
              >
                {formatMinor(row.balanceMinor)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

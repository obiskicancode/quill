'use client';

import { useRouter } from 'next/navigation';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@/components/admin/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';
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
          tabIndex={0}
          role="button"
          aria-label={`Open reservation ${row.reference}`}
          onClick={() => router.push(`/admin/reservations/${row.id}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(`/admin/reservations/${row.id}`);
            }
          }}
          className="rounded-card border-line bg-card shadow-raised cursor-pointer border p-4 transition-all focus:outline-none active:scale-[0.99]"
        >
          {/* Header row: Reference & Copy & Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-ink flex items-center gap-1.5 font-semibold">
              <span>{row.reference}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => handleCopy(e, row.reference)}
                aria-label={`Copy reference ${row.reference}`}
              >
                {copiedRef === row.reference ? (
                  <Check className="text-success size-3" aria-hidden="true" />
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
            <p className="text-ink font-semibold">{row.guestName}</p>
            {row.guestPhone && (
              <p className="text-caption text-muted-foreground">
                {row.guestPhone}
              </p>
            )}
            <p className="text-caption text-muted-foreground mt-1">
              {row.roomTypeName} • Room #{row.roomNumber}
            </p>
          </div>

          {/* Stay Dates and Financials */}
          <div className="border-line/60 text-caption mt-3 flex items-center justify-between border-t pt-2.5">
            <div>
              <span className="text-ink font-medium">
                {row.checkIn} → {row.checkOut}
              </span>
              <span className="text-muted-foreground ml-1">
                ({row.nights}n)
              </span>
            </div>

            <div>
              <span className="text-muted-foreground mr-1.5">Balance:</span>
              <span
                className={
                  row.balanceMinor > 0
                    ? 'text-destructive font-bold'
                    : 'text-ink'
                }
              >
                {formatNaira(row.balanceMinor / 100)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

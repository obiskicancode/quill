'use client';

import { CheckCircle2, CreditCard, FileImage, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import {
  AdminStatusBadge,
  paymentRecordTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Button } from '@/components/ui/button';
import { formatHotelDate, formatMinor } from '@/lib/format';
import type { ReservationPaymentItem } from '@/types/reservation.types';

import { ProofLightbox } from './ProofLightbox';

interface PaymentsPanelProps {
  payments: ReservationPaymentItem[] | null;
  reservationId: string;
  canRefund?: boolean;
  canVerifyTransfer?: boolean;
  onVerifyTransfer?: (payment: ReservationPaymentItem) => void;
  onRefund?: (payment: ReservationPaymentItem) => void;
}

/** Reservation payment ledger, proofs and refunds. */
export function PaymentsPanel({
  payments,
  reservationId,
  canRefund = false,
  canVerifyTransfer = false,
  onVerifyTransfer,
  onRefund,
}: PaymentsPanelProps) {
  const [selectedProof, setSelectedProof] = useState<{
    key: string;
    mime?: string | null;
    paymentId: string;
  } | null>(null);

  // If user lacks permission, payments is null (never sent to browser)
  if (!payments) return null;

  return (
    <>
      <AdminCard
        title="Payments and proofs"
        description="Transaction records, provider references, and customer receipts."
      >
        {payments.length === 0 ? (
          <AdminEmpty title="No payment records">
            No payments have been recorded for this reservation.
          </AdminEmpty>
        ) : (
          <div className="divide-y divide-line">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-control bg-paper text-muted-foreground">
                      <CreditCard className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-small font-semibold text-ink">
                        {formatMinor(p.amountMinor)}
                      </p>
                      <p className="text-caption text-muted-foreground capitalize">
                        {p.provider} • {p.type}
                      </p>
                    </div>
                  </div>

                  <AdminStatusBadge tone={paymentRecordTone(p.status)}>
                    {statusLabel(p.status)}
                  </AdminStatusBadge>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
                  <span className="truncate">
                    Ref:{' '}
                    <strong className="font-mono text-ink">
                      {p.reference}
                    </strong>
                    {p.providerRef && ` (${p.providerRef})`}
                  </span>

                  {p.paidAt && (
                    <span>Paid on: {formatHotelDate(p.paidAt)}</span>
                  )}
                </div>

                {/* Transfer Proof & Actions */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {p.proofKey && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSelectedProof({
                          key: p.proofKey!,
                          mime: p.proofMimeType,
                          paymentId: p.id,
                        })
                      }
                    >
                      <FileImage
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                      <span>View transfer proof</span>
                    </Button>
                  )}

                  {/* Verify Action Button */}
                  {p.status === 'pending' &&
                    canVerifyTransfer &&
                    onVerifyTransfer && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onVerifyTransfer(p)}
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        <span>Verify transfer</span>
                      </Button>
                    )}

                  {/* Refund Action Button */}
                  {p.status === 'paid' &&
                    p.type !== 'refund' &&
                    canRefund &&
                    onRefund && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onRefund(p)}
                      >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        <span>Refund</span>
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {selectedProof && (
        <ProofLightbox
          open={Boolean(selectedProof)}
          reservationId={reservationId}
          paymentId={selectedProof.paymentId}
          proofKey={selectedProof.key}
          proofMimeType={selectedProof.mime}
          onClose={() => setSelectedProof(null)}
        />
      )}
    </>
  );
}

'use client';

import { CheckCircle2, CreditCard, FileImage, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { AdminCard } from '@/components/admin/AdminCard';
import { AdminEmpty } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/format';
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
          <div className="divide-line divide-y">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-control bg-paper text-muted-foreground grid size-8 shrink-0 place-items-center">
                      <CreditCard className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-small text-ink font-semibold">
                        {formatNaira(p.amountMinor / 100)}
                      </p>
                      <p className="text-caption text-muted-foreground capitalize">
                        {p.provider} • {p.type}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-caption inline-flex rounded-full border px-2 py-0.5 font-semibold capitalize ${
                      p.status === 'paid'
                        ? 'border-success/30 bg-success/10 text-success'
                        : p.status === 'pending'
                          ? 'border-primary/30 bg-primary/15 text-brand-ink'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="text-caption text-muted-foreground mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate">
                    Ref:{' '}
                    <strong className="text-ink font-mono">
                      {p.reference}
                    </strong>
                    {p.providerRef && ` (${p.providerRef})`}
                  </span>

                  {p.paidAt && (
                    <span>
                      Paid on: {new Date(p.paidAt).toLocaleDateString('en-NG')}
                    </span>
                  )}
                </div>

                {/* Transfer Proof & Actions */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {p.proofKey && (
                    <Button
                      type="button"
                      variant="outline"
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
                        className="text-primary size-3.5"
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

'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import { AdminError, AdminLoading } from '@/components/admin/AdminStates';
import {
  AdminStatusBadge,
  paymentRecordTone,
  statusLabel,
} from '@/components/admin/AdminStatusBadge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import {
  formatHotelDateTime,
  formatHotelTime,
  formatMinorExact,
} from '@/lib/format';
import type { PaymentDetailResponse } from '@/types/payments.types';

/** Payment detail drawer: ledger, refunds, webhook events and owner-only payloads. */
export function PaymentDetailDrawer({
  isOpen,
  payment,
  error,
  onRetry,
  onClose,
  onReconcile,
  onUnreconcile,
  isOwner = false,
}: {
  isOpen: boolean;
  payment: PaymentDetailResponse | null;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onReconcile: (id: string) => void;
  onUnreconcile: (id: string) => void;
  isOwner?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rawCollapsed, setRawCollapsed] = useState(true);
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!isOpen) return null;

  const handleCopyRaw = () => {
    if (payment?.rawGatewayResponse) {
      navigator.clipboard.writeText(
        JSON.stringify(payment.rawGatewayResponse, null, 2),
      );
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" size="xl">
        <SheetHeader>
          {payment ? (
            <>
              <div className="flex items-center gap-2">
                <SheetTitle>Payment Details</SheetTitle>
                <AdminStatusBadge tone={paymentRecordTone(payment.status)}>
                  {statusLabel(payment.status)}
                </AdminStatusBadge>
              </div>
              <SheetDescription className="font-mono text-caption">
                {payment.reference}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle>Payment Details</SheetTitle>
              <SheetDescription className="sr-only">
                {error
                  ? 'Payment details could not be loaded.'
                  : 'Loading payment details.'}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody className="space-y-6">
          {!payment ? (
            error ? (
              <AdminError
                message={error}
                action={
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                }
              />
            ) : (
              <AdminLoading label="Loading payment details..." />
            )
          ) : (
            <>
              {/* Amount banner */}
              <div className="flex items-center justify-between rounded-control border border-line bg-paper p-4">
                <div>
                  <span className="text-caption text-muted-foreground">
                    Amount
                  </span>
                  <div className="font-mono text-h2 font-bold text-ink">
                    {formatMinorExact(payment.amountMinor)}
                  </div>
                </div>
                {payment.feeMinor > 0 && (
                  <div className="text-right text-caption text-muted-foreground">
                    <div>Fee: {formatMinorExact(payment.feeMinor)}</div>
                    <div className="font-medium text-ink">
                      Net: {formatMinorExact(payment.netAmountMinor)}
                    </div>
                  </div>
                )}
              </div>

              {/* Reservation Summary */}
              <div className="space-y-2 rounded-control border border-line p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold text-muted-foreground uppercase">
                    Linked Reservation
                  </span>
                  <Link
                    href={`/admin/reservations/${payment.reservationId}`}
                    className="inline-flex items-center gap-1 font-mono text-caption font-semibold text-brand-ink hover:underline"
                  >
                    {payment.reservationRef} <ExternalLink className="size-3" />
                  </Link>
                </div>
                <div className="font-medium text-ink">{payment.guestName}</div>
                <div className="text-caption text-muted-foreground">
                  {payment.guestEmail}
                </div>
                <div className="flex justify-between border-t border-line/60 pt-1 text-caption text-muted-foreground">
                  <span>{payment.reservation.roomTypeName}</span>
                  <span>
                    {payment.reservation.checkIn} →{' '}
                    {payment.reservation.checkOut} ({payment.reservation.nights}{' '}
                    nights)
                  </span>
                </div>
              </div>

              {/* Payment metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Payment Type
                  </span>
                  <span className="font-medium text-ink capitalize">
                    {payment.type}
                  </span>
                </div>
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Method & Provider
                  </span>
                  <span className="font-medium text-ink capitalize">
                    {payment.method.replace('_', ' ')} ({payment.provider})
                  </span>
                </div>
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Provider Reference
                  </span>
                  <span className="font-mono text-caption text-ink">
                    {payment.providerRef || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Paid At
                  </span>
                  <span className="font-mono text-caption text-ink">
                    {payment.paidAt ? formatHotelDateTime(payment.paidAt) : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Recorded By
                  </span>
                  <span className="text-caption text-ink">
                    {payment.recordedByName || payment.provider}
                  </span>
                </div>
                <div>
                  <span className="block text-caption text-muted-foreground">
                    Idempotency Key
                  </span>
                  <span className="block truncate font-mono text-micro text-muted-foreground">
                    {payment.idempotencyKey}
                  </span>
                </div>
              </div>

              {/* Failure reason if any */}
              {payment.failureReason && (
                <Alert variant="destructive" size="sm" role="note">
                  <strong>Failure Reason:</strong> {payment.failureReason}
                </Alert>
              )}

              {/* Transfer Proof Lightbox */}
              {payment.proofUrl && (
                <div className="space-y-2 rounded-control border border-line p-4">
                  <span className="text-caption font-semibold text-muted-foreground uppercase">
                    Transfer Receipt / Proof
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View uploaded receipt"
                    className="group relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden border-line bg-paper px-4 hover:bg-paper hover:text-ink hover:opacity-90"
                  >
                    <span className="flex items-center gap-1.5 text-caption text-muted-foreground group-hover:text-ink">
                      <ImageIcon className="size-4" />
                      <span>Click to view uploaded receipt</span>
                    </span>
                  </Button>
                </div>
              )}

              {/* Reconciliation Status & Actions */}
              <div className="space-y-3 rounded-control border border-line bg-paper/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold text-muted-foreground uppercase">
                    Reconciliation
                  </span>
                  {payment.reconciled ? (
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-success">
                      <ShieldCheck className="size-4" /> Reconciled
                    </span>
                  ) : (
                    <Badge variant="brand">Awaiting Reconciliation</Badge>
                  )}
                </div>

                {payment.reconciled && (
                  <div className="space-y-1 text-caption text-muted-foreground">
                    <div>
                      Reconciled by:{' '}
                      <span className="font-medium text-ink">
                        {payment.reconciledByName || 'Staff'}
                      </span>
                    </div>
                    {payment.reconciledAt && (
                      <div>
                        Reconciled at:{' '}
                        <span className="font-medium text-ink">
                          {formatHotelDateTime(payment.reconciledAt)}
                        </span>
                      </div>
                    )}
                    {payment.note && (
                      <div className="mt-1 rounded-sm border border-line bg-card p-2 whitespace-pre-wrap text-ink">
                        {payment.note}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {!payment.reconciled ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onReconcile(payment.id)}
                    >
                      Mark as Reconciled
                    </Button>
                  ) : isOwner ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onUnreconcile(payment.id)}
                    >
                      Unreconcile (Owner Only)
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Related Webhook Events */}
              {payment.webhooks && payment.webhooks.length > 0 && (
                <div className="space-y-2 rounded-control border border-line p-4">
                  <span className="text-caption font-semibold text-muted-foreground uppercase">
                    Related Gateway Webhooks
                  </span>
                  <div className="divide-y divide-line">
                    {payment.webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-center justify-between py-2 text-caption"
                      >
                        <div>
                          <span className="font-mono font-medium text-ink">
                            {wh.eventType || 'event'}
                          </span>
                          <div className="text-micro text-muted-foreground">
                            {formatHotelTime(wh.receivedAt)}
                          </div>
                        </div>
                        <span className="font-medium text-success">
                          Processed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Only: Raw Gateway Response Block */}
              {isOwner && payment.rawGatewayResponse && (
                <div className="overflow-hidden rounded-control border border-line">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRawCollapsed(!rawCollapsed)}
                    className="flex h-auto w-full items-center justify-between rounded-none bg-paper px-4 py-2.5 text-caption font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <span>Raw Gateway Response (Owner Only - Masked)</span>
                    {rawCollapsed ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </Button>
                  {!rawCollapsed && (
                    <div className="relative max-h-60 overflow-x-auto bg-ink p-4 font-mono text-micro text-paper">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyRaw}
                        className="absolute top-2 right-2 h-7 gap-1 bg-card/20 px-2 text-micro text-paper hover:bg-card/40"
                      >
                        {copiedRaw ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copiedRaw ? SUCCESS_MESSAGES.COPIED : 'Copy'}
                      </Button>
                      <pre>
                        {JSON.stringify(payment.rawGatewayResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SheetBody>

        <SheetFooter className="items-end border-t border-line bg-paper">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>

      {lightboxOpen && payment?.proofUrl && (
        <Dialog open onOpenChange={setLightboxOpen}>
          <DialogContent showCloseButton={false} size="3xl" surface="bare">
            <DialogTitle className="sr-only">Transfer Proof</DialogTitle>
            <DialogDescription className="sr-only">
              Uploaded proof of payment for this transaction.
            </DialogDescription>
            <Image
              src={payment.proofUrl}
              alt="Transfer Proof"
              className="max-h-[85vh] rounded-control object-contain shadow-float"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-paper hover:bg-white/15 hover:text-white"
              aria-label="Close transfer proof"
            >
              <span aria-hidden>✕</span>
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
}

'use client';

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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { PaymentDetailResponse } from '@/types/payments-admin.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export function PaymentDetailDrawer({
  payment,
  onClose,
  onReconcile,
  onUnreconcile,
  isOwner = false,
}: {
  payment: PaymentDetailResponse | null;
  onClose: () => void;
  onReconcile: (id: string) => void;
  onUnreconcile: (id: string) => void;
  isOwner?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rawCollapsed, setRawCollapsed] = useState(true);
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!payment) return null;

  const handleCopyRaw = () => {
    if (payment.rawGatewayResponse) {
      navigator.clipboard.writeText(
        JSON.stringify(payment.rawGatewayResponse, null, 2),
      );
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <Sheet
      open={Boolean(payment)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className="border-line bg-card w-full max-w-xl gap-0 border-l p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-line border-b px-6 py-4 pr-14">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-h3 font-display text-ink font-semibold">
              Payment Details
            </SheetTitle>
            <Badge
              variant="outline"
              className={`text-caption rounded-full px-2 py-0.5 font-semibold ${
                payment.status === 'paid'
                  ? 'border-success/20 bg-success/10 text-success'
                  : payment.status === 'pending'
                    ? 'border-primary/20 bg-primary/10 text-brand-ink'
                    : 'border-destructive/20 bg-destructive/10 text-destructive'
              }`}
            >
              {payment.status}
            </Badge>
          </div>
          <SheetDescription className="text-caption text-muted-foreground mt-0.5 font-mono">
            {payment.reference}
          </SheetDescription>
        </SheetHeader>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {/* Amount banner */}
          <div className="bg-paper border-line flex items-center justify-between rounded-lg border p-4">
            <div>
              <span className="text-caption text-muted-foreground">Amount</span>
              <div className="text-h2 text-ink font-mono font-bold">
                {formatNaira(payment.amountMinor)}
              </div>
            </div>
            {payment.feeMinor > 0 && (
              <div className="text-caption text-muted-foreground text-right">
                <div>Fee: {formatNaira(payment.feeMinor)}</div>
                <div className="text-ink font-medium">
                  Net: {formatNaira(payment.netAmountMinor)}
                </div>
              </div>
            )}
          </div>

          {/* Reservation Summary */}
          <div className="border-line space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted-foreground font-semibold uppercase">
                Linked Reservation
              </span>
              <Link
                href={`/admin/reservations/${payment.reservationId}`}
                className="text-caption text-primary inline-flex items-center gap-1 font-mono font-semibold hover:underline"
              >
                {payment.reservationRef} <ExternalLink className="size-3" />
              </Link>
            </div>
            <div className="text-ink font-medium">{payment.guestName}</div>
            <div className="text-caption text-muted-foreground">
              {payment.guestEmail}
            </div>
            <div className="text-caption text-muted-foreground border-line/60 flex justify-between border-t pt-1">
              <span>{payment.reservation.roomTypeName}</span>
              <span>
                {payment.reservation.checkIn} → {payment.reservation.checkOut} (
                {payment.reservation.nights} nights)
              </span>
            </div>
          </div>

          {/* Payment metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-caption text-muted-foreground block">
                Payment Type
              </span>
              <span className="text-ink font-medium capitalize">
                {payment.type}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted-foreground block">
                Method & Provider
              </span>
              <span className="text-ink font-medium capitalize">
                {payment.method.replace('_', ' ')} ({payment.provider})
              </span>
            </div>
            <div>
              <span className="text-caption text-muted-foreground block">
                Provider Reference
              </span>
              <span className="text-caption text-ink font-mono">
                {payment.providerRef || '—'}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted-foreground block">
                Paid At
              </span>
              <span className="text-caption text-ink font-mono">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString('en-GB')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted-foreground block">
                Recorded By
              </span>
              <span className="text-caption text-ink">
                {payment.recordedByName || payment.provider}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted-foreground block">
                Idempotency Key
              </span>
              <span className="text-muted-foreground block truncate font-mono text-[0.6875rem]">
                {payment.idempotencyKey}
              </span>
            </div>
          </div>

          {/* Failure reason if any */}
          {payment.failureReason && (
            <div className="border-destructive/30 bg-destructive/5 text-destructive text-caption rounded-lg border p-3">
              <strong>Failure Reason:</strong> {payment.failureReason}
            </div>
          )}

          {/* Transfer Proof Lightbox */}
          {payment.proofUrl && (
            <div className="border-line space-y-2 rounded-lg border p-4">
              <span className="text-caption text-muted-foreground font-semibold uppercase">
                Transfer Receipt / Proof
              </span>
              <div
                onClick={() => setLightboxOpen(true)}
                className="group border-line bg-paper relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border hover:opacity-90"
              >
                <div className="text-caption text-muted-foreground group-hover:text-ink flex items-center gap-1.5">
                  <ImageIcon className="size-4" />
                  <span>Click to view uploaded receipt</span>
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Status & Actions */}
          <div className="border-line bg-paper/50 space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted-foreground font-semibold uppercase">
                Reconciliation
              </span>
              {payment.reconciled ? (
                <span className="text-caption text-success inline-flex items-center gap-1 font-semibold">
                  <ShieldCheck className="size-4" /> Reconciled
                </span>
              ) : (
                <span className="text-caption border-primary/30 bg-primary/15 text-brand-ink inline-flex items-center rounded border px-2 py-0.5 font-medium">
                  Awaiting Reconciliation
                </span>
              )}
            </div>

            {payment.reconciled && (
              <div className="text-caption text-muted-foreground space-y-1">
                <div>
                  Reconciled by:{' '}
                  <span className="text-ink font-medium">
                    {payment.reconciledByName || 'Staff'}
                  </span>
                </div>
                {payment.reconciledAt && (
                  <div>
                    Reconciled at:{' '}
                    <span className="text-ink font-medium">
                      {new Date(payment.reconciledAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                )}
                {payment.note && (
                  <div className="bg-card border-line text-ink mt-1 rounded border p-2 whitespace-pre-wrap">
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
            <div className="border-line space-y-2 rounded-lg border p-4">
              <span className="text-caption text-muted-foreground font-semibold uppercase">
                Related Gateway Webhooks
              </span>
              <div className="divide-line divide-y">
                {payment.webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="text-caption flex items-center justify-between py-2"
                  >
                    <div>
                      <span className="text-ink font-mono font-medium">
                        {wh.eventType || 'event'}
                      </span>
                      <div className="text-muted-foreground text-[0.6875rem]">
                        {new Date(wh.receivedAt).toLocaleTimeString('en-GB')}
                      </div>
                    </div>
                    <span className="text-success font-medium">Processed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owner Only: Raw Gateway Response Block */}
          {isOwner && payment.rawGatewayResponse && (
            <div className="border-line overflow-hidden rounded-lg border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRawCollapsed(!rawCollapsed)}
                className="bg-paper text-caption text-muted-foreground hover:text-foreground flex h-auto w-full items-center justify-between rounded-none px-4 py-2.5 font-semibold"
              >
                <span>Raw Gateway Response (Owner Only - Masked)</span>
                {rawCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
              {!rawCollapsed && (
                <div className="bg-ink text-paper relative max-h-60 overflow-x-auto p-4 font-mono text-[0.6875rem]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyRaw}
                    className="bg-card/20 text-paper hover:bg-card/40 absolute top-2 right-2 h-7 gap-1 px-2 text-[0.625rem]"
                  >
                    {copiedRaw ? (
                      <Check className="text-success size-3" />
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
        </div>

        <div className="border-line bg-paper flex justify-end border-t p-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>

      {lightboxOpen && payment.proofUrl && (
        <Dialog open onOpenChange={setLightboxOpen}>
          <DialogContent
            showCloseButton={false}
            className="max-h-[90vh] max-w-3xl gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-3xl"
          >
            <DialogTitle className="sr-only">Transfer Proof</DialogTitle>
            <DialogDescription className="sr-only">
              Uploaded proof of payment for this transaction.
            </DialogDescription>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.proofUrl}
              alt="Transfer Proof"
              className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLightboxOpen(false)}
              className="text-paper absolute -top-10 right-0 hover:bg-white/15 hover:text-white"
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

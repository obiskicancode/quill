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
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border-line relative flex h-full w-full max-w-xl flex-col border-l shadow-2xl">
        {/* Header */}
        <div className="border-line flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h3 font-display text-ink font-semibold">
                Payment Details
              </h2>
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
            <p className="text-caption text-muted mt-0.5 font-mono">
              {payment.reference}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:bg-paper hover:text-ink rounded-full p-2"
            aria-label="Close detail drawer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-small flex-1 space-y-6 overflow-y-auto p-6">
          {/* Amount banner */}
          <div className="bg-paper border-line flex items-center justify-between rounded-lg border p-4">
            <div>
              <span className="text-caption text-muted">Amount</span>
              <div className="text-h2 text-ink font-mono font-bold">
                {formatNaira(payment.amountMinor)}
              </div>
            </div>
            {payment.feeMinor > 0 && (
              <div className="text-caption text-muted text-right">
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
              <span className="text-caption text-muted font-semibold uppercase">
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
            <div className="text-caption text-muted">{payment.guestEmail}</div>
            <div className="text-caption text-muted border-line/60 flex justify-between border-t pt-1">
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
              <span className="text-caption text-muted block">
                Payment Type
              </span>
              <span className="text-ink font-medium capitalize">
                {payment.type}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted block">
                Method & Provider
              </span>
              <span className="text-ink font-medium capitalize">
                {payment.method.replace('_', ' ')} ({payment.provider})
              </span>
            </div>
            <div>
              <span className="text-caption text-muted block">
                Provider Reference
              </span>
              <span className="text-caption text-ink font-mono">
                {payment.providerRef || '—'}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted block">Paid At</span>
              <span className="text-caption text-ink font-mono">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString('en-GB')
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted block">Recorded By</span>
              <span className="text-caption text-ink">
                {payment.recordedByName || payment.provider}
              </span>
            </div>
            <div>
              <span className="text-caption text-muted block">
                Idempotency Key
              </span>
              <span className="text-muted block truncate font-mono text-[11px]">
                {payment.idempotencyKey}
              </span>
            </div>
          </div>

          {/* Failure reason if any */}
          {payment.failureReason && (
            <div className="border-danger/30 bg-danger/5 text-danger text-caption rounded-lg border p-3">
              <strong>Failure Reason:</strong> {payment.failureReason}
            </div>
          )}

          {/* Transfer Proof Lightbox */}
          {payment.proofUrl && (
            <div className="border-line space-y-2 rounded-lg border p-4">
              <span className="text-caption text-muted font-semibold uppercase">
                Transfer Receipt / Proof
              </span>
              <div
                onClick={() => setLightboxOpen(true)}
                className="group border-line bg-paper relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border hover:opacity-90"
              >
                <div className="text-caption text-muted group-hover:text-ink flex items-center gap-1.5">
                  <ImageIcon className="size-4" />
                  <span>Click to view uploaded receipt</span>
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Status & Actions */}
          <div className="border-line bg-paper/50 space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-muted font-semibold uppercase">
                Reconciliation
              </span>
              {payment.reconciled ? (
                <span className="text-caption text-success inline-flex items-center gap-1 font-semibold">
                  <ShieldCheck className="size-4" /> Reconciled
                </span>
              ) : (
                <span className="text-caption inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
                  Awaiting Reconciliation
                </span>
              )}
            </div>

            {payment.reconciled && (
              <div className="text-caption text-muted space-y-1">
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
                  <div className="bg-surface border-line text-ink mt-1 rounded border p-2 whitespace-pre-wrap">
                    {payment.note}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              {!payment.reconciled ? (
                <button
                  type="button"
                  onClick={() => onReconcile(payment.id)}
                  className="bg-primary text-caption text-primary-ink rounded-md px-3 py-1.5 font-semibold hover:opacity-95"
                >
                  Mark as Reconciled
                </button>
              ) : isOwner ? (
                <button
                  type="button"
                  onClick={() => onUnreconcile(payment.id)}
                  className="border-danger/30 text-danger text-caption hover:bg-danger/5 rounded-md border px-3 py-1.5 font-medium"
                >
                  Unreconcile (Owner Only)
                </button>
              ) : null}
            </div>
          </div>

          {/* Related Webhook Events */}
          {payment.webhooks && payment.webhooks.length > 0 && (
            <div className="border-line space-y-2 rounded-lg border p-4">
              <span className="text-caption text-muted font-semibold uppercase">
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
                      <div className="text-muted text-[11px]">
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
              <button
                type="button"
                onClick={() => setRawCollapsed(!rawCollapsed)}
                className="bg-paper text-caption text-muted hover:text-ink flex w-full items-center justify-between px-4 py-2.5 font-semibold"
              >
                <span>Raw Gateway Response (Owner Only - Masked)</span>
                {rawCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {!rawCollapsed && (
                <div className="bg-ink text-paper relative max-h-60 overflow-x-auto p-4 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="bg-surface/20 text-paper hover:bg-surface/40 absolute top-2 right-2 flex items-center gap-1 rounded px-2 py-1 text-[10px]"
                  >
                    {copiedRaw ? (
                      <Check className="text-success size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedRaw ? 'Copied' : 'Copy'}
                  </button>
                  <pre>
                    {JSON.stringify(payment.rawGatewayResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-line bg-paper flex justify-end border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="border-line bg-surface text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox for transfer proof */}
      {lightboxOpen && payment.proofUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-h-[90vh] max-w-3xl">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="text-paper absolute -top-10 right-0 p-1 hover:text-white"
            >
              <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.proofUrl}
              alt="Transfer Proof"
              className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

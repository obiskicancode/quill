'use client';

import { CheckCircle2, FileImage, XCircle } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatNaira } from '@/lib/format';
import type {
  ReservationDetail,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface VerifyTransferModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  payment: ReservationPaymentItem;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function VerifyTransferModal({
  open,
  onClose,
  reservation,
  payment,
  onSuccess,
  onRefresh,
}: VerifyTransferModalProps) {
  const [mode, setMode] = useState<'verify' | 'reject'>('verify');
  const [verifiedNaira, setVerifiedNaira] = useState(
    (payment.amountMinor / 100).toString(),
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'verify') {
        const num = parseFloat(verifiedNaira);
        if (isNaN(num) || num <= 0) {
          setError(ERROR_MESSAGES.VALID_POSITIVE_VERIFIED_AMOUNT);
          setSubmitting(false);
          return;
        }

        const updated = await adminService.verifyTransfer(
          reservation.id,
          payment.id,
          {
            action: 'verify',
            amountMinor: Math.round(num * 100),
            note: note.trim() || undefined,
            version: reservation.updatedAt,
            idempotencyKey: crypto.randomUUID(),
          },
        );
        onSuccess(updated.data, SUCCESS_MESSAGES.TRANSFER_VERIFIED);
        onClose();
      } else {
        if (!rejectionReason || rejectionReason.trim().length < 3) {
          setError(ERROR_MESSAGES.REJECTION_REASON_DETAILED);
          setSubmitting(false);
          return;
        }

        const updated = await adminService.rejectTransfer(
          reservation.id,
          payment.id,
          {
            action: 'reject',
            rejectionReason: rejectionReason.trim(),
            note: note.trim() || undefined,
            version: reservation.updatedAt,
            idempotencyKey: crypto.randomUUID(),
          },
        );
        onSuccess(updated.data, SUCCESS_MESSAGES.TRANSFER_REJECTED);
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_PROCESS_TRANSFER,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Verify Bank Transfer Proof"
      description={`Inspect transfer receipt and confirm receipt of funds for ${reservation.reference}.`}
      error={error}
      maxWidth="xl"
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Receipt and Details Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left: Receipt Preview */}
          <div className="bg-muted rounded-control border-line flex flex-col items-center justify-center border p-4 text-center">
            {payment.proofKey ? (
              <div className="space-y-2">
                <FileImage
                  className="text-brand mx-auto size-12"
                  aria-hidden="true"
                />
                <p className="text-small text-ink font-semibold">
                  Transfer Receipt Attached
                </p>
                <a
                  href={`/api/admin/reservations/${reservation.id}/proof`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-brand inline-flex items-center font-semibold hover:underline"
                >
                  Open receipt in new tab &rarr;
                </a>
              </div>
            ) : (
              <p className="text-small text-muted-foreground">
                No image receipt uploaded for this transaction.
              </p>
            )}
          </div>

          {/* Right: Payment details */}
          <div className="bg-muted rounded-control border-line text-small space-y-2 border p-4">
            <div>
              <span className="text-caption text-muted-foreground">
                Reference:
              </span>
              <p className="text-ink font-mono font-semibold">
                {payment.reference}
              </p>
            </div>
            <div>
              <span className="text-caption text-muted-foreground">
                Expected Amount:
              </span>
              <p className="text-ink font-bold">
                {formatNaira(payment.amountMinor / 100)}
              </p>
            </div>
            <div>
              <span className="text-caption text-muted-foreground">
                Guest Name:
              </span>
              <p className="text-ink">{reservation.guestName}</p>
            </div>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="border-line grid grid-cols-2 gap-2 border-t pt-3">
          <Button
            type="button"
            variant={mode === 'verify' ? 'default' : 'outline'}
            size="md"
            onClick={() => setMode('verify')}
            className={
              mode === 'verify'
                ? 'bg-success hover:bg-success/90 text-white'
                : ''
            }
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>Mark as Received</span>
          </Button>
          <Button
            type="button"
            variant={mode === 'reject' ? 'destructive' : 'outline'}
            size="md"
            onClick={() => setMode('reject')}
          >
            <XCircle className="size-4" aria-hidden="true" />
            <span>Reject Proof</span>
          </Button>
        </div>

        {mode === 'verify' ? (
          <div className="space-y-1.5">
            <Label htmlFor="verified-amount">
              Verified Amount Received (₦){' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="verified-amount"
              type="number"
              step="any"
              required
              value={verifiedNaira}
              onChange={(e) => setVerifiedNaira(e.target.value)}
            />
            <p className="text-caption text-muted-foreground">
              If the verified amount satisfies the deposit or stay total, the
              booking will automatically move to confirmed.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="rejection-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Funds not reflected in hotel bank account, blurred receipt, incorrect amount..."
            />
            <p className="text-caption text-muted-foreground">
              This message will be emailed to the guest. Their booking hold will
              remain active until normal expiration.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="transfer-internal-note">Internal Note</Label>
          <Input
            id="transfer-internal-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Staff notes for audit log..."
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === 'verify' ? 'default' : 'destructive'}
            size="sm"
            loading={submitting}
          >
            {mode === 'verify' ? 'Confirm receipt & verify' : 'Reject transfer'}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

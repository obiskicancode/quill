'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function CancelModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: CancelModalProps) {
  const [preview, setPreview] = useState<{
    calculatedRefundMinor: number;
    retainedMinor: number;
    rule: string;
    maxRefundMinor: number;
  } | null>(null);

  const [overrideRefund, setOverrideRefund] = useState(false);
  const [refundNaira, setRefundNaira] = useState('0');
  const [overrideReason, setOverrideReason] = useState('');
  const [reason, setReason] = useState('guest_requested');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [doNotEmailGuest, setDoNotEmailGuest] = useState(false);

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      adminService
        .previewCancellation(reservation.id)
        .then((res) => {
          setPreview(res.data);
          setRefundNaira((res.data.calculatedRefundMinor / 100).toString());
          setError(null);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to preview cancellation',
          );
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [open, reservation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      setError('Please acknowledge that cancellation cannot be undone.');
      return;
    }

    const num = parseFloat(refundNaira);
    if (isNaN(num) || num < 0) {
      setError('Invalid refund amount.');
      return;
    }

    if (
      overrideRefund &&
      (!overrideReason || overrideReason.trim().length < 3)
    ) {
      setError(
        'A reason is required when overriding the policy refund amount.',
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.cancelReservation(reservation.id, {
        refundAmountMinor: Math.round(num * 100),
        overrideReason: overrideRefund ? overrideReason.trim() : undefined,
        reason,
        note: note.trim() || undefined,
        doNotEmailGuest,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to cancel reservation',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Cancel Reservation"
      description={`Cancel stay ${reservation.reference} for ${reservation.guestName}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Alert */}
        <div className="rounded-control border-danger/30 bg-danger/10 text-small text-danger flex items-start gap-2.5 border p-3">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            Cancelling frees room {reservation.roomNumber} immediately for new
            bookings. This action cannot be reversed.
          </span>
        </div>

        {/* Policy Refund Preview */}
        {loadingPreview ? (
          <div className="text-small text-muted flex items-center justify-center p-6">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Calculating policy refund...
          </div>
        ) : preview ? (
          <div className="bg-canvas rounded-control border-line text-small space-y-2 border p-4">
            <h3 className="text-ink font-semibold">
              Cancellation Policy Evaluation
            </h3>
            <p className="text-caption text-muted">{preview.rule}</p>
            <div className="border-line flex items-center justify-between border-t pt-2">
              <span className="text-muted">Calculated Policy Refund:</span>
              <span className="text-success font-bold">
                {formatNaira(preview.calculatedRefundMinor / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Amount Retained:</span>
              <span className="text-ink font-medium">
                {formatNaira(preview.retainedMinor / 100)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Override Refund Option */}
        <div className="border-line space-y-2 border-t pt-3">
          <label className="text-small text-ink flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={overrideRefund}
              onChange={(e) => setOverrideRefund(e.target.checked)}
              className="border-line text-accent focus:ring-accent size-4 rounded-sm"
            />
            <span>Override policy refund amount (Manager / Owner)</span>
          </label>

          {overrideRefund && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="text-small text-ink block font-semibold">
                  Custom Refund Amount (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={(preview?.maxRefundMinor ?? 0) / 100}
                  value={refundNaira}
                  onChange={(e) => setRefundNaira(e.target.value)}
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                />
                <p className="text-caption text-muted mt-1">
                  Maximum refundable:{' '}
                  {formatNaira((preview?.maxRefundMinor ?? 0) / 100)}
                </p>
              </div>

              <div>
                <label className="text-small text-ink block font-semibold">
                  Override Reason <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Management courtesy due to flight disruption..."
                  className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Reason Selection */}
        <div>
          <label className="text-small text-ink block font-semibold">
            Reason for Cancellation <span className="text-danger">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          >
            <option value="guest_requested">
              Guest requested cancellation
            </option>
            <option value="emergency_change">
              Medical or personal emergency
            </option>
            <option value="duplicate_booking">Duplicate booking</option>
            <option value="hotel_maintenance">
              Hotel maintenance or room issue
            </option>
            <option value="unpaid_expired">
              Payment not completed in time
            </option>
            <option value="other">Other reason</option>
          </select>
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Staff Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional notes for hotel records..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        {/* Options */}
        <div className="border-line space-y-2 border-t pt-3">
          <label className="text-small text-ink flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={doNotEmailGuest}
              onChange={(e) => setDoNotEmailGuest(e.target.checked)}
              className="border-line text-accent focus:ring-accent size-4 rounded-sm"
            />
            <span>Do not email cancellation notice to guest</span>
          </label>

          <label className="text-small text-danger flex cursor-pointer items-center gap-2 font-semibold">
            <input
              type="checkbox"
              required
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="border-danger text-danger focus:ring-danger size-4 rounded-sm"
            />
            <span>I understand that this cancellation cannot be undone</span>
          </label>
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Keep reservation
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={submitting || !acknowledged}
          >
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Cancelling...
              </>
            ) : (
              'Confirm cancellation'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

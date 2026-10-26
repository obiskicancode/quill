'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type {
  ReservationDetail,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  payment: ReservationPaymentItem;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function RefundModal({
  open,
  onClose,
  reservation,
  payment,
  onSuccess,
  onRefresh,
}: RefundModalProps) {
  const maxNaira = payment.amountMinor / 100;
  const [amountNaira, setAmountNaira] = useState(maxNaira.toString());
  const [method, setMethod] = useState<
    'provider' | 'manual_bank' | 'manual_cash'
  >(
    payment.provider === 'cash'
      ? 'manual_cash'
      : payment.provider === 'bank_transfer'
        ? 'manual_bank'
        : 'provider',
  );
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState(
    () => `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountNaira);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive refund amount.');
      return;
    }
    if (num > maxNaira) {
      setError(
        `Amount cannot exceed payment balance (${formatNaira(maxNaira)}).`,
      );
      return;
    }
    if (!reason || reason.trim().length < 3) {
      setError('Please provide a reason for the refund.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.issueRefund(reservation.id, {
        paymentId: payment.id,
        amountMinor: Math.round(num * 100),
        reason: reason.trim(),
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue refund');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Issue Refund"
      description={`Refund payment ${payment.reference} for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Summary */}
        <div className="bg-canvas rounded-control border-line text-small flex items-center justify-between border p-3">
          <div>
            <span className="text-caption text-muted">Original Payment:</span>
            <p className="text-ink font-semibold">
              {formatNaira(payment.amountMinor / 100)} ({payment.provider})
            </p>
          </div>
          <span className="text-caption text-muted font-mono">
            {payment.reference}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Refund Amount (₦) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              max={maxNaira}
              required
              value={amountNaira}
              onChange={(e) => setAmountNaira(e.target.value)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Refund Channel <span className="text-danger">*</span>
            </label>
            <select
              value={method}
              onChange={(e) =>
                setMethod(
                  e.target.value as 'provider' | 'manual_bank' | 'manual_cash',
                )
              }
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            >
              {payment.provider !== 'cash' &&
                payment.provider !== 'bank_transfer' && (
                  <option value="provider">
                    Original Payment Gateway ({payment.provider})
                  </option>
                )}
              <option value="manual_bank">Bank Transfer to Guest</option>
              <option value="manual_cash">Cash Handed to Guest</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Refund Reason <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Overpayment adjustment, early departure..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Internal Note / Reference
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction reference or receipt code..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 font-mono focus:outline-hidden"
          />
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Staff Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context or notes..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full resize-none border px-3 py-2 focus:outline-hidden"
          />
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Processing refund...
              </>
            ) : (
              'Confirm refund'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

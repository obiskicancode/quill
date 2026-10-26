'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function RecordPaymentModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: RecordPaymentModalProps) {
  const maxNaira = reservation.balanceMinor / 100;

  const [amountNaira, setAmountNaira] = useState(maxNaira.toString());
  const [type, setType] = useState<'deposit' | 'balance' | 'full'>('balance');
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'card'>(
    'cash',
  );
  const [reference, setReference] = useState(
    () => `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountNaira);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }
    if (num > maxNaira + 1) {
      setError(
        `Amount cannot exceed the balance due (${formatNaira(maxNaira)}).`,
      );
      return;
    }

    const amountMinor = Math.round(num * 100);
    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.recordPayment(reservation.id, {
        amountMinor,
        type,
        method,
        reference: reference.trim(),
        note: note.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Record Payment"
      description={`Record an in-person, cash, transfer, or POS payment for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outstanding Balance Banner */}
        <div className="bg-canvas rounded-control border-line text-small flex items-center justify-between border p-3.5">
          <span className="text-muted">Balance Due:</span>
          <span className="text-ink font-bold">
            {formatNaira(reservation.balanceMinor / 100)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Amount (₦) <span className="text-danger">*</span>
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
              Payment Allocation
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'deposit' | 'balance' | 'full')
              }
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            >
              <option value="balance">Balance Payment</option>
              <option value="deposit">Deposit Payment</option>
              <option value="full">Full Stay Payment</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-small text-ink block font-semibold">
              Payment Method <span className="text-danger">*</span>
            </label>
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as 'cash' | 'bank_transfer' | 'card')
              }
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            >
              <option value="cash">Cash at Hotel</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="card">Card POS Terminal</option>
            </select>
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Payment Reference <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 font-mono focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="text-small text-ink block font-semibold">
            Staff Note / Receipt Info
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Received at front desk desk receipt #0492..."
            className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
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
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Recording...
              </>
            ) : (
              'Record payment'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

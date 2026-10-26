'use client';

import { AlertCircle, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

export function ReconciliationModal({
  isOpen,
  mode,
  paymentIds,
  onClose,
  onConfirmReconcile,
  onConfirmUnreconcile,
  loading = false,
}: {
  isOpen: boolean;
  mode: 'reconcile' | 'unreconcile';
  paymentIds: string[];
  onClose: () => void;
  onConfirmReconcile: (note?: string) => Promise<void>;
  onConfirmUnreconcile: (reason: string) => Promise<void>;
  loading?: boolean;
}) {
  const [noteOrReason, setNoteOrReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'unreconcile') {
      if (!noteOrReason.trim() || noteOrReason.trim().length < 5) {
        setError(
          'A valid reason (minimum 5 characters) is required to unreconcile.',
        );
        return;
      }
      await onConfirmUnreconcile(noteOrReason.trim());
    } else {
      await onConfirmReconcile(noteOrReason.trim() || undefined);
    }
  };

  const isReconcile = mode === 'reconcile';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="rounded-card border-line bg-surface w-full max-w-md border p-6 shadow-xl">
        <div className="border-line flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            {isReconcile ? (
              <ShieldCheck className="text-success size-5" />
            ) : (
              <AlertCircle className="text-danger size-5" />
            )}
            <h3 className="font-display text-h3 text-ink font-semibold">
              {isReconcile
                ? `Reconcile Payment${paymentIds.length > 1 ? 's' : ''}`
                : 'Unreconcile Payment'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink rounded p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-small text-muted">
            {isReconcile
              ? `You are marking ${paymentIds.length} payment(s) as verified against the hotel bank or physical cash records.`
              : 'Unreconciling will reset this payment to unverified and clear reconciliation timestamps. This action will be audited.'}
          </p>

          <div>
            <label className="text-caption text-ink mb-1 block font-semibold">
              {isReconcile
                ? 'Audit Note (Optional)'
                : 'Reason for Unreconciling (Required)'}
            </label>
            <textarea
              rows={3}
              required={!isReconcile}
              placeholder={
                isReconcile
                  ? 'e.g., Verified against Zenith Bank statement dated 26-Oct...'
                  : 'e.g., Bank chargeback received or ledger mismatch...'
              }
              value={noteOrReason}
              onChange={(e) => setNoteOrReason(e.target.value)}
              className="border-line bg-paper text-small text-ink placeholder:text-muted focus:border-primary w-full rounded-md border p-2.5 focus:outline-none"
            />
          </div>

          {error && (
            <div className="border-danger/30 bg-danger/5 text-caption text-danger rounded border p-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="border-line text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`text-small rounded-md px-4 py-2 font-semibold ${
                isReconcile
                  ? 'bg-primary text-primary-ink hover:opacity-95'
                  : 'bg-danger text-white hover:opacity-95'
              }`}
            >
              {loading
                ? 'Processing...'
                : isReconcile
                  ? 'Confirm Reconciliation'
                  : 'Confirm Unreconcile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

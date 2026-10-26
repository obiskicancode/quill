'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

import type {
  ManualRefundItem,
  ManualRefundPayoutInput,
} from '@/types/payments-admin.types';

function formatNaira(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function generatePayoutReference(): string {
  return `REF-TRF-${Date.now().toString().slice(-6)}`;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ManualRefundsTab({
  refunds,
  loading = false,
  onMarkPaidOut,
  onRecheckProvider,
}: {
  refunds: ManualRefundItem[];
  loading?: boolean;
  onMarkPaidOut: (id: string, input: ManualRefundPayoutInput) => Promise<void>;
  onRecheckProvider: (id: string) => Promise<string>;
}) {
  const [selectedRefund, setSelectedRefund] = useState<ManualRefundItem | null>(
    null,
  );
  const [payoutForm, setPayoutForm] = useState<{
    amountNaira: string;
    method: 'bank_transfer' | 'cash';
    reference: string;
    paidDate: string;
    doNotEmailGuest: boolean;
    note: string;
  }>(() => ({
    amountNaira: '',
    method: 'bank_transfer',
    reference: '',
    paidDate: '',
    doNotEmailGuest: false,
    note: '',
  }));

  const [submitting, setSubmitting] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [recheckFeedback, setRecheckFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenPayout = (refund: ManualRefundItem) => {
    setSelectedRefund(refund);
    setPayoutForm({
      amountNaira: String(refund.refundDueMinor / 100),
      method: refund.method === 'cash' ? 'cash' : 'bank_transfer',
      reference: generatePayoutReference(),
      paidDate: getTodayDateString(),
      doNotEmailGuest: false,
      note: `Manual refund paid out for ${refund.guestName}`,
    });
    setFormError(null);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;

    const amountMinor = Math.round(Number(payoutForm.amountNaira) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setFormError('Please enter a valid payout amount.');
      return;
    }
    if (amountMinor > selectedRefund.refundDueMinor) {
      setFormError(
        `Payout amount cannot exceed refund amount due (${formatNaira(selectedRefund.refundDueMinor)})`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await onMarkPaidOut(selectedRefund.id, {
        amountMinor,
        method: payoutForm.method,
        reference: payoutForm.reference,
        paidDate: payoutForm.paidDate,
        idempotencyKey: `payout-${selectedRefund.id}-${Date.now()}`,
        doNotEmailGuest: payoutForm.doNotEmailGuest,
        note: payoutForm.note,
      });
      setSelectedRefund(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to record refund payout';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecheck = async (id: string) => {
    setRecheckingId(id);
    setRecheckFeedback(null);
    try {
      const msg = await onRecheckProvider(id);
      setRecheckFeedback(msg);
    } catch {
      setRecheckFeedback('Could not reach gateway status API.');
    } finally {
      setRecheckingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-card border-line bg-surface text-muted border p-8 text-center">
        Loading pending refunds...
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className="rounded-card border-line bg-paper border border-dashed p-8 text-center">
        <CheckCircle2 className="text-success mx-auto mb-2 size-8" />
        <h3 className="text-ink font-semibold">All Refunds Up to Date</h3>
        <p className="text-small text-muted mt-1">
          There are no pending manual or provider refunds awaiting action.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recheckFeedback && (
        <div className="border-line bg-paper text-caption text-ink flex items-center justify-between rounded-md border p-3">
          <span>{recheckFeedback}</span>
          <button
            type="button"
            onClick={() => setRecheckFeedback(null)}
            className="text-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="rounded-card border-line bg-surface overflow-x-auto border">
        <table className="text-small w-full text-left">
          <thead className="border-line bg-paper text-caption text-muted border-b font-semibold uppercase">
            <tr>
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">Guest Name</th>
              <th className="px-4 py-3">Refund Due (₦)</th>
              <th className="px-4 py-3">Provider / Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {refunds.map((refund) => {
              const isManual =
                refund.provider === 'bank_transfer' ||
                refund.provider === 'cash';

              return (
                <tr key={refund.id} className="hover:bg-paper/50">
                  <td className="text-ink px-4 py-3 font-mono font-medium">
                    <Link
                      href={`/admin/reservations/${refund.reservationId}`}
                      className="hover:text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      {refund.reservationRef}{' '}
                      <ExternalLink className="text-muted size-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink font-medium">
                      {refund.guestName}
                    </div>
                    <div className="text-caption text-muted">
                      {refund.guestEmail}
                    </div>
                  </td>
                  <td className="text-danger px-4 py-3 font-mono font-bold">
                    {formatNaira(refund.refundDueMinor)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-ink font-medium capitalize">
                      {refund.provider}
                    </span>
                    <span className="text-caption text-muted block capitalize">
                      {refund.method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-caption inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
                      {isManual
                        ? 'Manual Payout Due'
                        : refund.providerState || 'Processing at Gateway'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isManual ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPayout(refund)}
                        className="bg-primary text-caption text-primary-ink rounded-md px-3 py-1.5 font-semibold hover:opacity-95"
                      >
                        Mark as Paid Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRecheck(refund.id)}
                        disabled={recheckingId === refund.id}
                        className="border-line bg-paper text-caption text-ink hover:bg-surface inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium"
                      >
                        <RefreshCw
                          className={`size-3.5 ${recheckingId === refund.id ? 'animate-spin' : ''}`}
                        />
                        Re-check Status
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payout Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="rounded-card border-line bg-surface w-full max-w-lg space-y-4 border p-6 shadow-xl">
            <div className="border-line flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-h3 text-ink font-semibold">
                Record Manual Refund Payout
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="text-muted hover:text-ink rounded p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitPayout}
              className="text-small space-y-4"
            >
              <div className="bg-paper border-line text-caption text-muted space-y-1 rounded-lg border p-3">
                <div>
                  Booking:{' '}
                  <strong className="text-ink font-mono">
                    {selectedRefund.reservationRef}
                  </strong>
                </div>
                <div>
                  Guest:{' '}
                  <strong className="text-ink">
                    {selectedRefund.guestName}
                  </strong>{' '}
                  ({selectedRefund.guestEmail})
                </div>
                <div>
                  Total refund due:{' '}
                  <strong className="text-danger font-mono font-bold">
                    {formatNaira(selectedRefund.refundDueMinor)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption text-ink mb-1 block font-semibold">
                    Amount Paid Out (₦)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payoutForm.amountNaira}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        amountNaira: e.target.value,
                      })
                    }
                    className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-caption text-ink mb-1 block font-semibold">
                    Payout Method
                  </label>
                  <select
                    value={payoutForm.method}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        method: e.target.value as 'bank_transfer' | 'cash',
                      })
                    }
                    className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2 focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption text-ink mb-1 block font-semibold">
                    Payout Reference / Narration
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutForm.reference}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        reference: e.target.value,
                      })
                    }
                    className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-caption text-ink mb-1 block font-semibold">
                    Date Paid
                  </label>
                  <input
                    type="date"
                    required
                    value={payoutForm.paidDate}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, paidDate: e.target.value })
                    }
                    className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-caption text-ink mb-1 block font-semibold">
                  Internal Note
                </label>
                <textarea
                  rows={2}
                  value={payoutForm.note}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, note: e.target.value })
                  }
                  className="border-line bg-paper text-ink focus:border-primary w-full rounded-md border p-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="doNotEmailGuest"
                  checked={payoutForm.doNotEmailGuest}
                  onChange={(e) =>
                    setPayoutForm({
                      ...payoutForm,
                      doNotEmailGuest: e.target.checked,
                    })
                  }
                  className="border-line text-primary focus:ring-primary size-4 rounded"
                />
                <label
                  htmlFor="doNotEmailGuest"
                  className="text-caption text-ink cursor-pointer"
                >
                  Do not email the guest about this refund (internal / offline
                  handled)
                </label>
              </div>

              {formError && (
                <div className="border-danger/30 bg-danger/5 text-caption text-danger rounded border p-2">
                  {formError}
                </div>
              )}

              <div className="border-line flex items-center justify-end gap-2 border-t pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  disabled={submitting}
                  className="border-line text-small text-ink hover:bg-paper rounded-md border px-4 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-small text-primary-ink rounded-md px-4 py-2 font-semibold hover:opacity-95"
                >
                  {submitting ? 'Recording...' : 'Confirm Paid Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

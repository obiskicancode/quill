'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface ApproveDeclineModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  initialAction?: 'approve' | 'decline';
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function ApproveDeclineModal({
  open,
  onClose,
  reservation,
  initialAction = 'approve',
  onSuccess,
  onRefresh,
}: ApproveDeclineModalProps) {
  const [action, setAction] = useState<'approve' | 'decline'>(initialAction);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === 'decline' && (!reason || reason.trim().length < 3)) {
      setError('Please provide a reason for declining the reservation.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        action,
        reason: reason.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      };

      const updated =
        action === 'approve'
          ? await adminService.approveReservation(reservation.id, payload)
          : await adminService.declineReservation(reservation.id, payload);

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process approval action',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title={
        action === 'approve' ? 'Approve Reservation' : 'Decline Reservation'
      }
      description={`Review manual booking request for ${reservation.guestName} (${reservation.reference}).`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAction('approve')}
            className={`rounded-control text-small flex items-center justify-center gap-2 border p-3 font-semibold transition-colors ${
              action === 'approve'
                ? 'border-success bg-success/15 text-success ring-success ring-2'
                : 'border-line text-muted hover:border-ink hover:text-ink'
            }`}
          >
            <Check className="size-4" aria-hidden="true" />
            <span>Approve Booking</span>
          </button>
          <button
            type="button"
            onClick={() => setAction('decline')}
            className={`rounded-control text-small flex items-center justify-center gap-2 border p-3 font-semibold transition-colors ${
              action === 'decline'
                ? 'border-danger bg-danger/15 text-danger ring-danger ring-2'
                : 'border-line text-muted hover:border-ink hover:text-ink'
            }`}
          >
            <X className="size-4" aria-hidden="true" />
            <span>Decline Request</span>
          </button>
        </div>

        {/* Stay Summary */}
        <div className="bg-canvas rounded-control border-line text-small space-y-1 border p-3">
          <p>
            <span className="text-muted">Room:</span> {reservation.roomTypeName}{' '}
            (Room {reservation.roomNumber})
          </p>
          <p>
            <span className="text-muted">Dates:</span> {reservation.checkIn} to{' '}
            {reservation.checkOut} ({reservation.nights} nights)
          </p>
          <p>
            <span className="text-muted">Guests:</span> {reservation.adults}{' '}
            Adults
            {reservation.children > 0
              ? `, ${reservation.children} Children`
              : ''}
          </p>
        </div>

        {action === 'approve' ? (
          <p className="text-small text-muted">
            Approving moves this reservation to <strong>Confirmed</strong>{' '}
            status and sends confirmation to{' '}
            <strong>{reservation.guestEmail || 'the guest'}</strong> with
            payment instructions.
          </p>
        ) : (
          <div>
            <label className="text-small text-ink block font-semibold">
              Decline Reason <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hotel fully committed for private event, maintenance shutdown..."
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
            <p className="text-caption text-muted mt-1">
              Declining cancels the booking and frees the assigned room
              immediately.
            </p>
          </div>
        )}

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={action === 'approve' ? 'primary' : 'danger'}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
                Processing...
              </>
            ) : action === 'approve' ? (
              'Confirm approval'
            ) : (
              'Decline & release room'
            )}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

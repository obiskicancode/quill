'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface ApproveDeclineModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  initialAction?: 'approve' | 'decline';
  onSuccess: (updated: ReservationDetail, message?: string) => void;
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

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (action === 'decline' && (!reason || reason.trim().length < 3)) {
      setError(ERROR_MESSAGES.DECLINE_REASON_PROMPT);
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

      onSuccess(
        updated.data,
        action === 'approve'
          ? SUCCESS_MESSAGES.RESERVATION_APPROVED
          : SUCCESS_MESSAGES.RESERVATION_DECLINED,
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_PROCESS_APPROVAL,
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
          <Button
            type="button"
            variant={action === 'approve' ? 'default' : 'outline'}
            size="md"
            onClick={() => setAction('approve')}
            className={
              action === 'approve'
                ? 'bg-success hover:bg-success/90 text-white'
                : ''
            }
          >
            <Check className="size-4" aria-hidden="true" />
            <span>Approve Booking</span>
          </Button>
          <Button
            type="button"
            variant={action === 'decline' ? 'destructive' : 'outline'}
            size="md"
            onClick={() => setAction('decline')}
          >
            <X className="size-4" aria-hidden="true" />
            <span>Decline Request</span>
          </Button>
        </div>

        {/* Stay Summary */}
        <div className="bg-muted rounded-control border-line text-small space-y-1 border p-3">
          <p>
            <span className="text-muted-foreground">Room:</span>{' '}
            {reservation.roomTypeName} (Room {reservation.roomNumber})
          </p>
          <p>
            <span className="text-muted-foreground">Dates:</span>{' '}
            {reservation.checkIn} to {reservation.checkOut} (
            {reservation.nights} nights)
          </p>
          <p>
            <span className="text-muted-foreground">Guests:</span>{' '}
            {reservation.adults} Adults
            {reservation.children > 0
              ? `, ${reservation.children} Children`
              : ''}
          </p>
        </div>

        {action === 'approve' ? (
          <p className="text-small text-muted-foreground">
            Approving moves this reservation to <strong>Confirmed</strong>{' '}
            status and sends confirmation to{' '}
            <strong>{reservation.guestEmail || 'the guest'}</strong> with
            payment instructions.
          </p>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="decline-reason">
              Decline Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="decline-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Hotel fully committed for private event, maintenance shutdown..."
            />
            <p className="text-caption text-muted-foreground">
              Declining cancels the booking and frees the assigned room
              immediately.
            </p>
          </div>
        )}

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
            variant={action === 'approve' ? 'default' : 'destructive'}
            size="sm"
            loading={submitting}
          >
            {action === 'approve'
              ? 'Confirm approval'
              : 'Decline & release room'}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

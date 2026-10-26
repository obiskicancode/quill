'use client';

import { Loader2, MailCheck } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/Button';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface ResendConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: () => void;
  onRefresh: () => void;
}

export function ResendConfirmationModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: ResendConfirmationModalProps) {
  const [templateKey, setTemplateKey] = useState<
    'booking_confirmation' | 'payment_receipt' | 'cancellation_notice'
  >('booking_confirmation');
  const [recipient, setRecipient] = useState(reservation.guestEmail ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !recipient.includes('@')) {
      setError('Please provide a valid recipient email address.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await adminService.resendConfirmation(reservation.id, {
        templateKey,
        recipient: recipient.trim(),
        idempotencyKey: crypto.randomUUID(),
      });

      setSentSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to resend confirmation email',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Resend Guest Notification"
      description={`Queue confirmation or receipt email for ${reservation.reference}.`}
      error={error}
      onRefresh={onRefresh}
    >
      {sentSuccess ? (
        <div className="text-success flex flex-col items-center justify-center space-y-2 p-6 text-center">
          <MailCheck className="size-12" aria-hidden="true" />
          <h3 className="text-ink text-base font-semibold">
            Notification Dispatched!
          </h3>
          <p className="text-small text-muted">
            The notification has been queued for immediate delivery to{' '}
            {recipient}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-small text-ink block font-semibold">
              Template Type <span className="text-danger">*</span>
            </label>
            <select
              value={templateKey}
              onChange={(e) =>
                setTemplateKey(
                  e.target.value as
                    | 'booking_confirmation'
                    | 'payment_receipt'
                    | 'cancellation_notice',
                )
              }
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            >
              <option value="booking_confirmation">Booking Confirmation</option>
              <option value="payment_receipt">Payment Receipt</option>
              <option value="cancellation_notice">Cancellation Notice</option>
            </select>
          </div>

          <div>
            <label className="text-small text-ink block font-semibold">
              Recipient Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="guest@example.com"
              className="rounded-control border-line bg-paper text-small text-ink focus:border-ink mt-1 w-full border px-3 py-2 focus:outline-hidden"
            />
            <p className="text-caption text-muted mt-1">
              You can send to the guest&apos;s email or an alternative address.
            </p>
          </div>

          <div className="bg-canvas rounded-control border-line text-caption text-muted border p-3">
            Resend cooldown: to prevent mail provider throttling, requests are
            logged in audit history.
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
                  Sending...
                </>
              ) : (
                'Send notification'
              )}
            </Button>
          </div>
        </form>
      )}
    </ActionModal>
  );
}

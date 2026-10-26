'use client';

import { MailCheck } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
          <p className="text-small text-muted-foreground">
            The notification has been queued for immediate delivery to{' '}
            {recipient}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resend-template">
              Template Type <span className="text-destructive">*</span>
            </Label>
            <Select
              items={[
                {
                  value: 'booking_confirmation',
                  label: 'Booking Confirmation',
                },
                {
                  value: 'payment_receipt',
                  label: 'Payment Receipt',
                },
                {
                  value: 'cancellation_notice',
                  label: 'Cancellation Notice',
                },
              ]}
              value={templateKey}
              onValueChange={(val) => {
                if (val) {
                  setTemplateKey(
                    val as
                      | 'booking_confirmation'
                      | 'payment_receipt'
                      | 'cancellation_notice',
                  );
                }
              }}
            >
              <SelectTrigger id="resend-template" className="w-full">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking_confirmation">
                  Booking Confirmation
                </SelectItem>
                <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
                <SelectItem value="cancellation_notice">
                  Cancellation Notice
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-recipient">
              Recipient Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="resend-recipient"
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="guest@example.com"
            />
            <p className="text-caption text-muted-foreground">
              You can send to the guest&apos;s email or an alternative address.
            </p>
          </div>

          <div className="bg-muted rounded-control border-line text-caption text-muted-foreground border p-3">
            Resend cooldown: to prevent mail provider throttling, requests are
            logged in audit history.
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
            <Button type="submit" size="sm" loading={submitting}>
              Send notification
            </Button>
          </div>
        </form>
      )}
    </ActionModal>
  );
}

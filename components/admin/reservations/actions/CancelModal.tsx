'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-3">
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
          <div className="text-small text-muted-foreground flex items-center justify-center p-6">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Calculating policy refund...
          </div>
        ) : preview ? (
          <div className="bg-muted rounded-control border-line text-small space-y-2 border p-4">
            <h3 className="text-ink font-semibold">
              Cancellation Policy Evaluation
            </h3>
            <p className="text-caption text-muted-foreground">{preview.rule}</p>
            <div className="border-line flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">
                Calculated Policy Refund:
              </span>
              <span className="text-success font-bold">
                {formatNaira(preview.calculatedRefundMinor / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount Retained:</span>
              <span className="text-ink font-medium">
                {formatNaira(preview.retainedMinor / 100)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Override Refund Option */}
        <div className="border-line space-y-3 border-t pt-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cancel-override-refund"
              checked={overrideRefund}
              onCheckedChange={(checked) => setOverrideRefund(!!checked)}
            />
            <Label htmlFor="cancel-override-refund" className="cursor-pointer">
              Override policy refund amount (Manager / Owner)
            </Label>
          </div>

          {overrideRefund && (
            <div className="space-y-3 pl-6">
              <div className="space-y-1.5">
                <Label htmlFor="cancel-refund-amount">
                  Custom Refund Amount (₦)
                </Label>
                <Input
                  id="cancel-refund-amount"
                  type="number"
                  step="any"
                  min="0"
                  max={(preview?.maxRefundMinor ?? 0) / 100}
                  value={refundNaira}
                  onChange={(e) => setRefundNaira(e.target.value)}
                />
                <p className="text-caption text-muted-foreground">
                  Maximum refundable:{' '}
                  {formatNaira((preview?.maxRefundMinor ?? 0) / 100)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cancel-override-reason">
                  Override Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cancel-override-reason"
                  type="text"
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Management courtesy due to flight disruption..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Reason Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">
            Reason for Cancellation <span className="text-destructive">*</span>
          </Label>
          <Select
            items={[
              {
                value: 'guest_requested',
                label: 'Guest requested cancellation',
              },
              {
                value: 'emergency_change',
                label: 'Medical or personal emergency',
              },
              {
                value: 'duplicate_booking',
                label: 'Duplicate booking',
              },
              {
                value: 'hotel_maintenance',
                label: 'Hotel maintenance or room issue',
              },
              {
                value: 'unpaid_expired',
                label: 'Payment not completed in time',
              },
              { value: 'other', label: 'Other reason' },
            ]}
            value={reason}
            onValueChange={(val) => {
              if (val) setReason(val);
            }}
          >
            <SelectTrigger id="cancel-reason" className="w-full">
              <SelectValue placeholder="Select cancellation reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guest_requested">
                Guest requested cancellation
              </SelectItem>
              <SelectItem value="emergency_change">
                Medical or personal emergency
              </SelectItem>
              <SelectItem value="duplicate_booking">
                Duplicate booking
              </SelectItem>
              <SelectItem value="hotel_maintenance">
                Hotel maintenance or room issue
              </SelectItem>
              <SelectItem value="unpaid_expired">
                Payment not completed in time
              </SelectItem>
              <SelectItem value="other">Other reason</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-staff-note">Staff Note</Label>
          <Input
            id="cancel-staff-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Additional notes for hotel records..."
          />
        </div>

        {/* Options */}
        <div className="border-line space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cancel-no-email"
              checked={doNotEmailGuest}
              onCheckedChange={(checked) => setDoNotEmailGuest(!!checked)}
            />
            <Label htmlFor="cancel-no-email" className="cursor-pointer">
              Do not email cancellation notice to guest
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cancel-acknowledged"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(!!checked)}
            />
            <Label
              htmlFor="cancel-acknowledged"
              className="text-destructive cursor-pointer font-semibold"
            >
              I understand that this cancellation cannot be undone
            </Label>
          </div>
        </div>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Keep reservation
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={submitting || !acknowledged}
            loading={submitting}
          >
            Confirm cancellation
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

'use client';

import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNaira } from '@/lib/format';
import type { ReservationDetail } from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

interface MarkNoShowModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  onSuccess: (updated: ReservationDetail) => void;
  onRefresh: () => void;
}

export function MarkNoShowModal({
  open,
  onClose,
  reservation,
  onSuccess,
  onRefresh,
}: MarkNoShowModalProps) {
  const [overrideRefund, setOverrideRefund] = useState(false);
  const [refundNaira, setRefundNaira] = useState('0');
  const [overrideReason, setOverrideReason] = useState('');
  const [reason, setReason] = useState(
    'Guest failed to check in on arrival date',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const netPaidNaira =
    (reservation.amountPaidMinor - reservation.amountRefundedMinor) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = overrideRefund ? parseFloat(refundNaira) : 0;
    if (isNaN(num) || num < 0 || num > netPaidNaira) {
      setError(
        `Refund amount must be between ₦0 and ${formatNaira(netPaidNaira)}.`,
      );
      return;
    }

    if (
      overrideRefund &&
      (!overrideReason || overrideReason.trim().length < 3)
    ) {
      setError('Please provide a reason for the refund override.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const updated = await adminService.markNoShow(reservation.id, {
        refundAmountMinor: Math.round(num * 100),
        overrideReason: overrideRefund ? overrideReason.trim() : undefined,
        reason: reason.trim() || undefined,
        version: reservation.updatedAt,
        idempotencyKey: crypto.randomUUID(),
      });

      onSuccess(updated.data);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to mark as no-show',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Mark as No-Show"
      description={`Record no-show for ${reservation.guestName} (${reservation.reference}).`}
      error={error}
      onRefresh={onRefresh}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-control border-destructive/30 bg-destructive/10 text-small text-destructive flex items-start gap-2.5 border p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Marking as no-show frees room {reservation.roomNumber} for the
            remaining nights of the stay.
          </span>
        </div>

        <div className="bg-muted rounded-control border-line text-small space-y-1 border p-3.5">
          <p className="text-ink font-semibold">Hotel No-Show Policy:</p>
          <p className="text-caption text-muted-foreground">
            Guests who fail to arrive by the scheduled date are considered
            no-shows and forfeit the deposit or paid stay under hotel terms.
          </p>
        </div>

        {/* Override refund toggle */}
        {netPaidNaira > 0 && (
          <div className="border-line space-y-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="noshow-override-refund"
                checked={overrideRefund}
                onCheckedChange={(checked) => setOverrideRefund(!!checked)}
              />
              <Label
                htmlFor="noshow-override-refund"
                className="cursor-pointer"
              >
                Issue goodwill partial refund (Staff override)
              </Label>
            </div>

            {overrideRefund && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <Label htmlFor="noshow-refund-amount">
                    Refund Amount (₦)
                  </Label>
                  <Input
                    id="noshow-refund-amount"
                    type="number"
                    step="any"
                    min="0"
                    max={netPaidNaira}
                    value={refundNaira}
                    onChange={(e) => setRefundNaira(e.target.value)}
                  />
                  <p className="text-caption text-muted-foreground">
                    Max refundable: {formatNaira(netPaidNaira)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="noshow-override-reason">
                    Override Reason <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="noshow-override-reason"
                    type="text"
                    required
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Guest notified delay, partial refund authorized..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="noshow-reason">Note / Reason</Label>
          <Input
            id="noshow-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            loading={submitting}
          >
            Confirm no-show
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

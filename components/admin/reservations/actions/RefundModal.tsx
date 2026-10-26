'use client';

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
import { Textarea } from '@/components/ui/textarea';
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
        <div className="bg-muted rounded-control border-line text-small flex items-center justify-between border p-3">
          <div>
            <span className="text-caption text-muted-foreground">
              Original Payment:
            </span>
            <p className="text-ink font-semibold">
              {formatNaira(payment.amountMinor / 100)} ({payment.provider})
            </p>
          </div>
          <span className="text-caption text-muted-foreground font-mono">
            {payment.reference}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">
              Refund Amount (₦) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="refund-amount"
              type="number"
              step="any"
              min="1"
              max={maxNaira}
              required
              value={amountNaira}
              onChange={(e) => setAmountNaira(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund-channel">
              Refund Channel <span className="text-destructive">*</span>
            </Label>
            <Select
              items={[
                ...(payment.provider !== 'cash' &&
                payment.provider !== 'bank_transfer'
                  ? [
                      {
                        value: 'provider',
                        label: `Original Payment Gateway (${payment.provider})`,
                      },
                    ]
                  : []),
                {
                  value: 'manual_bank',
                  label: 'Bank Transfer to Guest',
                },
                {
                  value: 'manual_cash',
                  label: 'Cash Handed to Guest',
                },
              ]}
              value={method}
              onValueChange={(val) => {
                if (val) {
                  setMethod(val as 'provider' | 'manual_bank' | 'manual_cash');
                }
              }}
            >
              <SelectTrigger id="refund-channel" className="w-full">
                <SelectValue placeholder="Select refund channel" />
              </SelectTrigger>
              <SelectContent>
                {payment.provider !== 'cash' &&
                  payment.provider !== 'bank_transfer' && (
                    <SelectItem value="provider">
                      Original Payment Gateway ({payment.provider})
                    </SelectItem>
                  )}
                <SelectItem value="manual_bank">
                  Bank Transfer to Guest
                </SelectItem>
                <SelectItem value="manual_cash">
                  Cash Handed to Guest
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="refund-reason">
            Refund Reason <span className="text-destructive">*</span>
          </Label>
          <Input
            id="refund-reason"
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Overpayment adjustment, early departure..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="refund-reference">Internal Note / Reference</Label>
          <Input
            id="refund-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction reference or receipt code..."
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="refund-staff-notes">Staff Notes</Label>
          <Textarea
            id="refund-staff-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context or notes..."
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
            Confirm refund
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

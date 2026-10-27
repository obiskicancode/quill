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
import { ERROR_MESSAGES } from '@/constants/error-messages';
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
      setError(ERROR_MESSAGES.POSITIVE_PAYMENT_AMOUNT);
      return;
    }
    if (num > maxNaira + 1) {
      setError(ERROR_MESSAGES.AMOUNT_EXCEEDS_BALANCE(formatNaira(maxNaira)));
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
      setError(
        err instanceof Error
          ? err.message
          : ERROR_MESSAGES.FAILED_TO_RECORD_PAYMENT_UI,
      );
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
        <div className="bg-muted rounded-control border-line text-small flex items-center justify-between border p-3.5">
          <span className="text-muted-foreground">Balance Due:</span>
          <span className="text-ink font-bold">
            {formatNaira(reservation.balanceMinor / 100)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">
              Amount (₦) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payment-amount"
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
            <Label htmlFor="payment-allocation">Payment Allocation</Label>
            <Select
              items={[
                { value: 'balance', label: 'Balance Payment' },
                { value: 'deposit', label: 'Deposit Payment' },
                { value: 'full', label: 'Full Stay Payment' },
              ]}
              value={type}
              onValueChange={(val) => {
                if (val) setType(val as 'deposit' | 'balance' | 'full');
              }}
            >
              <SelectTrigger id="payment-allocation" className="w-full">
                <SelectValue placeholder="Select allocation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance">Balance Payment</SelectItem>
                <SelectItem value="deposit">Deposit Payment</SelectItem>
                <SelectItem value="full">Full Stay Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment-method">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <Select
              items={[
                { value: 'cash', label: 'Cash at Hotel' },
                { value: 'bank_transfer', label: 'Direct Bank Transfer' },
                { value: 'card', label: 'Card POS Terminal' },
              ]}
              value={method}
              onValueChange={(val) => {
                if (val) setMethod(val as 'cash' | 'bank_transfer' | 'card');
              }}
            >
              <SelectTrigger id="payment-method" className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash at Hotel</SelectItem>
                <SelectItem value="bank_transfer">
                  Direct Bank Transfer
                </SelectItem>
                <SelectItem value="card">Card POS Terminal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">
              Payment Reference <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payment-reference"
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-note">Staff Note / Receipt Info</Label>
          <Textarea
            id="payment-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Received at front desk desk receipt #0492..."
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
          <Button type="submit" size="sm" loading={submitting}>
            Record payment
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

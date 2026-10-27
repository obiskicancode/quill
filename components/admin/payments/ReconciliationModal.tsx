'use client';

import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';

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
        setError(ERROR_MESSAGES.UNRECONCILE_REASON_MIN_5_PERIOD);
        return;
      }
      await onConfirmUnreconcile(noteOrReason.trim());
    } else {
      await onConfirmReconcile(noteOrReason.trim() || undefined);
    }
  };

  const isReconcile = mode === 'reconcile';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent className="rounded-card border-line bg-card max-w-md gap-0 border p-0 shadow-xl sm:max-w-md">
        <DialogHeader className="border-line border-b p-6 pr-14 pb-3">
          <div className="flex items-center gap-2">
            {isReconcile ? (
              <ShieldCheck className="text-success size-5" aria-hidden />
            ) : (
              <AlertCircle className="text-destructive size-5" aria-hidden />
            )}
            <DialogTitle className="font-display text-h3 text-ink font-semibold">
              {isReconcile
                ? `Reconcile Payment${paymentIds.length > 1 ? 's' : ''}`
                : 'Unreconcile Payment'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <DialogDescription className="text-small text-muted-foreground">
            {isReconcile
              ? `You are marking ${paymentIds.length} payment(s) as verified against the hotel bank or physical cash records.`
              : 'Unreconciling will reset this payment to unverified and clear reconciliation timestamps. This action will be audited.'}
          </DialogDescription>

          <div className="space-y-1.5">
            <Label
              htmlFor="reconcile-note"
              className="text-caption font-semibold"
            >
              {isReconcile
                ? 'Audit Note (Optional)'
                : 'Reason for Unreconciling (Required)'}
            </Label>
            <Textarea
              id="reconcile-note"
              rows={3}
              required={!isReconcile}
              placeholder={
                isReconcile
                  ? 'e.g., Verified against Zenith Bank statement dated 26-Oct...'
                  : 'e.g., Bank chargeback received or ledger mismatch...'
              }
              value={noteOrReason}
              onChange={(e) => setNoteOrReason(e.target.value)}
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-destructive/30 bg-destructive/5 text-caption text-destructive"
            >
              {error}
            </Alert>
          )}

          <DialogFooter className="border-line border-t bg-transparent px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={isReconcile ? 'primary' : 'danger'}
              loading={loading}
            >
              {isReconcile ? 'Confirm Reconciliation' : 'Confirm Unreconcile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

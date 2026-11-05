'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';

const reconcileFormSchema = z.object({
  noteOrReason: z.string().trim().max(500),
});

const unreconcileFormSchema = z.object({
  noteOrReason: z
    .string()
    .trim()
    .min(5, ERROR_MESSAGES.UNRECONCILE_REASON_MIN_5_PERIOD)
    .max(500),
});

type ReconciliationInput = z.input<typeof unreconcileFormSchema>;
type ReconciliationOutput = z.output<typeof unreconcileFormSchema>;

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
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ReconciliationInput, unknown, ReconciliationOutput>({
    resolver: zodResolver(
      mode === 'reconcile' ? reconcileFormSchema : unreconcileFormSchema,
    ),
    defaultValues: { noteOrReason: '' },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = form;

  if (!isOpen) return null;

  const busy = isSubmitting || loading;
  const isReconcile = mode === 'reconcile';

  const handleFormSubmit = async (input: ReconciliationOutput) => {
    setError(null);
    try {
      if (mode === 'unreconcile') {
        await onConfirmUnreconcile(input.noteOrReason.trim());
      } else {
        await onConfirmReconcile(input.noteOrReason.trim() || undefined);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isReconcile
            ? ERROR_MESSAGES.FAILED_TO_RECONCILE
            : ERROR_MESSAGES.FAILED_TO_UNRECONCILE,
      );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isReconcile ? (
              <ShieldCheck className="size-5 text-success" aria-hidden />
            ) : (
              <AlertCircle className="size-5 text-destructive" aria-hidden />
            )}
            <DialogTitle>
              {isReconcile
                ? `Reconcile Payment${paymentIds.length > 1 ? 's' : ''}`
                : 'Unreconcile Payment'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-4">
            <DialogDescription>
              {isReconcile
                ? `You are marking ${paymentIds.length} payment(s) as verified against the hotel bank or physical cash records.`
                : 'Unreconciling will reset this payment to unverified and clear reconciliation timestamps. This action will be audited.'}
            </DialogDescription>

            <Field
              id="reconcile-note"
              label={
                isReconcile
                  ? 'Audit Note (Optional)'
                  : 'Reason for Unreconciling (Required)'
              }
              error={errors.noteOrReason?.message}
            >
              {(a11y) => (
                <Textarea
                  {...a11y}
                  {...register('noteOrReason')}
                  rows={3}
                  required={!isReconcile}
                  placeholder={
                    isReconcile
                      ? 'e.g., Verified against Zenith Bank statement dated 26-Oct...'
                      : 'e.g., Bank chargeback received or ledger mismatch...'
                  }
                />
              )}
            </Field>

            {error && (
              <Alert variant="destructive" size="sm">
                {error}
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={isReconcile ? 'primary' : 'danger'}
              loading={busy}
            >
              {isReconcile ? 'Confirm Reconciliation' : 'Confirm Unreconcile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

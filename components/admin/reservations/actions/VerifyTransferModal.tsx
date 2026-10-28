'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FileImage, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useVerifyReservationTransfer } from '@/hooks/services/admin/use-reservations';
import { formatNaira } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { adminVerifyTransferSchema } from '@/schemas/reservation.schema';
import type {
  ReservationDetail,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ActionModal } from './ActionModal';

const verifyTransferFormSchema = adminVerifyTransferSchema
  .omit({ version: true, idempotencyKey: true, amountMinor: true })
  .extend({
    verifiedNaira: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'verify') {
      const amount = Number.parseFloat(value.verifiedNaira);
      if (Number.isNaN(amount) || amount <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['verifiedNaira'],
          message: ERROR_MESSAGES.VALID_POSITIVE_VERIFIED_AMOUNT,
        });
      }
    } else if (
      !value.rejectionReason ||
      value.rejectionReason.trim().length < 3
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejectionReason'],
        message: ERROR_MESSAGES.REJECTION_REASON_DETAILED,
      });
    }
  });

type VerifyTransferFormInput = z.input<typeof verifyTransferFormSchema>;
type VerifyTransferFormOutput = z.output<typeof verifyTransferFormSchema>;

interface VerifyTransferModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  payment: ReservationPaymentItem;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

export function VerifyTransferModal({
  open,
  onClose,
  reservation,
  payment,
  onSuccess,
  onRefresh,
}: VerifyTransferModalProps) {
  const verifyTransfer = useVerifyReservationTransfer();
  const form = useForm<
    VerifyTransferFormInput,
    unknown,
    VerifyTransferFormOutput
  >({
    resolver: zodResolver(verifyTransferFormSchema),
    defaultValues: {
      action: 'verify',
      verifiedNaira: (payment.amountMinor / 100).toString(),
      rejectionReason: '',
      note: '',
    },
    mode: 'onBlur',
  });
  const {
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
    setValue,
    watch,
  } = form;
  const mode = watch('action');
  const busy = isSubmitting || verifyTransfer.isPending;
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (input: VerifyTransferFormOutput) => {
    setError(null);

    try {
      const body =
        input.action === 'verify'
          ? {
              action: 'verify' as const,
              amountMinor: Math.round(
                Number.parseFloat(input.verifiedNaira) * 100,
              ),
              note: input.note?.trim() || undefined,
              version: reservation.updatedAt,
              idempotencyKey: crypto.randomUUID(),
            }
          : {
              action: 'reject' as const,
              rejectionReason: input.rejectionReason?.trim(),
              note: input.note?.trim() || undefined,
              version: reservation.updatedAt,
              idempotencyKey: crypto.randomUUID(),
            };

      const updated = await verifyTransfer.mutateAsync({
        id: reservation.id,
        paymentId: payment.id,
        body,
      });

      onSuccess(
        updated,
        input.action === 'verify'
          ? SUCCESS_MESSAGES.TRANSFER_VERIFIED
          : SUCCESS_MESSAGES.TRANSFER_REJECTED,
      );
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : ERROR_MESSAGES.FAILED_TO_PROCESS_TRANSFER,
      );
      applyServerFieldErrors(setFieldError, caught);
    }
  };

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      title="Verify Bank Transfer Proof"
      description={`Inspect transfer receipt and confirm receipt of funds for ${reservation.reference}.`}
      error={error}
      maxWidth="xl"
      onRefresh={onRefresh}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Receipt and Details Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left: Receipt Preview */}
          <div className="bg-muted rounded-control border-line flex flex-col items-center justify-center border p-4 text-center">
            {payment.proofKey ? (
              <div className="space-y-2">
                <FileImage
                  className="text-brand mx-auto size-12"
                  aria-hidden="true"
                />
                <p className="text-small text-ink font-semibold">
                  Transfer Receipt Attached
                </p>
                <a
                  href={`/api/admin/reservations/${reservation.id}/proof`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-brand inline-flex items-center font-semibold hover:underline"
                >
                  Open receipt in new tab &rarr;
                </a>
              </div>
            ) : (
              <p className="text-small text-muted-foreground">
                No image receipt uploaded for this transaction.
              </p>
            )}
          </div>

          {/* Right: Payment details */}
          <div className="bg-muted rounded-control border-line text-small space-y-2 border p-4">
            <div>
              <span className="text-caption text-muted-foreground">
                Reference:
              </span>
              <p className="text-ink font-mono font-semibold">
                {payment.reference}
              </p>
            </div>
            <div>
              <span className="text-caption text-muted-foreground">
                Expected Amount:
              </span>
              <p className="text-ink font-bold">
                {formatNaira(payment.amountMinor / 100)}
              </p>
            </div>
            <div>
              <span className="text-caption text-muted-foreground">
                Guest Name:
              </span>
              <p className="text-ink">{reservation.guestName}</p>
            </div>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="border-line grid grid-cols-2 gap-2 border-t pt-3">
          <Button
            type="button"
            variant={mode === 'verify' ? 'default' : 'outline'}
            size="md"
            onClick={() => setValue('action', 'verify')}
            className={
              mode === 'verify'
                ? 'bg-success hover:bg-success/90 text-white'
                : ''
            }
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>Mark as Received</span>
          </Button>
          <Button
            type="button"
            variant={mode === 'reject' ? 'destructive' : 'outline'}
            size="md"
            onClick={() => setValue('action', 'reject')}
          >
            <XCircle className="size-4" aria-hidden="true" />
            <span>Reject Proof</span>
          </Button>
        </div>

        {mode === 'verify' ? (
          <Field
            id="verified-amount"
            label="Verified Amount Received (₦) *"
            error={errors.verifiedNaira?.message}
            hint="If the verified amount satisfies the deposit or stay total, the booking will automatically move to confirmed."
          >
            {(a) => (
              <Input
                {...a}
                {...register('verifiedNaira')}
                type="number"
                step="any"
                disabled={busy}
                className={inputClass(errors.verifiedNaira?.message)}
              />
            )}
          </Field>
        ) : (
          <Field
            id="rejection-reason"
            label="Rejection Reason *"
            error={errors.rejectionReason?.message}
            hint="This message will be emailed to the guest. Their booking hold will remain active until normal expiration."
          >
            {(a) => (
              <Textarea
                {...a}
                {...register('rejectionReason')}
                rows={3}
                disabled={busy}
                placeholder="e.g. Funds not reflected in hotel bank account, blurred receipt, incorrect amount..."
                className={inputClass(errors.rejectionReason?.message)}
              />
            )}
          </Field>
        )}

        <Field
          id="transfer-internal-note"
          label="Internal Note"
          error={errors.note?.message}
        >
          {(a) => (
            <Input
              {...a}
              {...register('note')}
              type="text"
              disabled={busy}
              placeholder="Staff notes for audit log..."
              className={inputClass(errors.note?.message)}
            />
          )}
        </Field>

        <div className="border-line flex items-center justify-end gap-3 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === 'verify' ? 'default' : 'destructive'}
            size="sm"
            loading={busy}
          >
            {mode === 'verify' ? 'Confirm receipt & verify' : 'Reject transfer'}
          </Button>
        </div>
      </form>
    </ActionModal>
  );
}

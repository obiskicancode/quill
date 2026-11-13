'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FileImage, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { useVerifyReservationTransfer } from '@/hooks/services/admin/use-reservations';
import { formatMinor } from '@/lib/format';
import { applyServerFieldErrors } from '@/lib/forms/server-errors';
import { cn } from '@/lib/utils';
import { verifyTransferSchema } from '@/schemas/reservation.schema';
import type {
  ReservationDetail,
  ReservationPaymentItem,
} from '@/types/reservation.types';

import { ProofLightbox } from '../detail/ProofLightbox';
import { ActionModal } from './ActionModal';

const verifyTransferFormSchema = verifyTransferSchema
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

const DECISION_LABEL_ID = 'transfer-verification-decision';

const DECISIONS = [
  {
    value: 'verify',
    label: 'Funds received',
    text: 'The transfer matches the receipt and is in the hotel account.',
    icon: CheckCircle2,
    cardClass: 'border-success bg-success/10 ring-1 ring-success',
    itemClass: 'data-checked:border-success data-checked:bg-success',
  },
  {
    value: 'reject',
    label: 'Reject the proof',
    text: 'No matching funds, or the receipt is unusable. The guest is emailed your reason.',
    icon: XCircle,
    cardClass: 'border-destructive bg-destructive/10 ring-1 ring-destructive',
    itemClass: 'data-checked:border-destructive data-checked:bg-destructive',
  },
] as const;

interface VerifyTransferModalProps {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail;
  payment: ReservationPaymentItem;
  onSuccess: (updated: ReservationDetail, message?: string) => void;
  onRefresh: () => void;
}

/** Verifies or rejects a bank-transfer proof and advances the booking. */
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
    control,
    formState: { errors, isSubmitting },
    register,
    setError: setFieldError,
    setValue,
  } = form;
  const mode = useWatch({ control, name: 'action' });
  const busy = isSubmitting || verifyTransfer.isPending;
  const [error, setError] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

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

  const handleRequestClose = () => {
    setProofOpen(false);
    onClose();
  };

  return (
    <ActionModal
      open={open}
      onClose={handleRequestClose}
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
          <div className="flex flex-col justify-center gap-2 rounded-control border border-line bg-muted p-4">
            <span className="text-caption font-semibold text-muted-foreground uppercase">
              Transfer receipt
            </span>
            {payment.proofKey ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setProofOpen(true)}
                aria-label="View uploaded receipt"
                className="group flex h-32 w-full cursor-pointer items-center justify-center border-line bg-paper px-4 text-ink hover:bg-paper hover:opacity-90"
              >
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground group-hover:text-ink">
                  <FileImage className="size-4" aria-hidden="true" />
                  <span>Click to view the uploaded receipt</span>
                </span>
              </Button>
            ) : (
              <p className="text-small text-muted-foreground">
                No receipt image was uploaded with this transfer. Check it
                against your bank statement before marking the funds received.
              </p>
            )}
          </div>

          {/* Right: Payment details */}
          <div className="space-y-2 rounded-control border border-line bg-muted p-4 text-small">
            <div>
              <span className="text-caption text-muted-foreground">
                Reference:
              </span>
              <p className="font-mono font-semibold text-ink">
                {payment.reference}
              </p>
            </div>
            <div>
              <span className="text-caption text-muted-foreground">
                Expected Amount:
              </span>
              <p className="font-bold text-ink">
                {formatMinor(payment.amountMinor)}
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

        {/* Decision */}
        <div className="space-y-2 border-t border-line pt-3">
          <p id={DECISION_LABEL_ID} className="font-semibold">
            What happened when you checked the bank account?
          </p>
          <RadioGroup
            value={mode}
            onValueChange={(val) =>
              setValue('action', val === 'reject' ? 'reject' : 'verify')
            }
            aria-labelledby={DECISION_LABEL_ID}
            disabled={busy}
            className="gap-2 sm:grid-cols-2"
          >
            {DECISIONS.map((decision) => {
              const selected = mode === decision.value;
              const Icon = decision.icon;
              return (
                <Label
                  key={decision.value}
                  htmlFor={`${DECISION_LABEL_ID}-${decision.value}`}
                  className={cn(
                    'flex min-h-14 cursor-pointer items-start gap-3 rounded-control border p-3 font-normal transition-colors',
                    selected
                      ? decision.cardClass
                      : 'border-line bg-card hover:bg-paper',
                    busy && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <RadioGroupItem
                    value={decision.value}
                    id={`${DECISION_LABEL_ID}-${decision.value}`}
                    disabled={busy}
                    className={cn('mt-1', decision.itemClass)}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon className="size-4" aria-hidden="true" />
                      <span>{decision.label}</span>
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      {decision.text}
                    </span>
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
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

        <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRequestClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === 'verify' ? 'primary' : 'destructive'}
            size="sm"
            loading={busy}
          >
            {mode === 'verify' ? 'Confirm receipt & verify' : 'Reject transfer'}
          </Button>
        </div>
      </form>

      {payment.proofKey && (
        <ProofLightbox
          open={proofOpen}
          reservationId={reservation.id}
          paymentId={payment.id}
          proofKey={payment.proofKey}
          proofMimeType={payment.proofMimeType}
          onClose={() => setProofOpen(false)}
        />
      )}
    </ActionModal>
  );
}

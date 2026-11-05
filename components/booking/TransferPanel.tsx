'use client';

import { Upload } from 'lucide-react';
import { useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { BankTransferCard } from '@/components/payment/BankTransferCard';
import { Button } from '@/components/ui/button';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { useUploadBookingProof } from '@/hooks/services/guest/use-booking';
import { checkProofFile } from '@/schemas/checkout.schema';
import type { GuestReservation } from '@/types/booking.types';

/** The hotel's account, the exact amount and the receipt upload, once the guest has transferred. */
export function TransferPanel({
  v,
  onUploaded,
}: {
  v: GuestReservation;
  onUploaded: () => void;
}) {
  const uploadProof = useUploadBookingProof();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!v.bank) return null;

  async function submit() {
    if (!file) return setError(ERROR_MESSAGES.CHOOSE_TRANSFER_RECEIPT);
    const problem = checkProofFile(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    try {
      await uploadProof.mutateAsync({ reference: v.reference, file });
      onUploaded();
    } catch (e) {
      setError(
        e instanceof ServiceError && e.body?.message
          ? e.body.message
          : ERROR_MESSAGES.COULD_NOT_UPLOAD_RECEIPT,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <BankTransferCard
      details={v.bank.details}
      amountMinor={v.bank.amountMinor}
      reference={v.reference}
      idPrefix="field-proof"
      heading="h2"
      proof={{
        file,
        error,
        onFile: (f) => {
          setFile(f);
          setError(null);
        },
      }}
      disabled={busy}
      receiptReceived={v.proofUploaded}
      action={
        <Button
          loading={busy}
          icon={<Upload className="size-4" aria-hidden />}
          onClick={submit}
        >
          Submit transfer details
        </Button>
      }
    />
  );
}

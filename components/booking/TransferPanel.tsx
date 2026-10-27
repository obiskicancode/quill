'use client';

import { cn } from 'cn';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FileCheck, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { checkoutService } from '@/app/api/services/checkout.service';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatMinor } from '@/lib/format';
import { checkProofFile, MAX_PROOF_BYTES } from '@/schemas/checkout.schema';
import type { GuestReservation } from '@/types/booking.types';

import { CopyButton } from '../checkout/PaymentStep';
import { EASE_OUT } from '../motion/variants';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '../ui/attachment';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/** Bank details, exact amount and reference, plus the receipt upload when no proof has been sent yet. */
export function TransferPanel({
  v,
  onUploaded,
}: {
  v: GuestReservation;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();
  if (!v.bank) return null;

  const rows: [string, string, string | null][] = [
    ['Bank', v.bank.details.bankName, null],
    ['Account name', v.bank.details.accountName, null],
    ['Account number', v.bank.details.accountNumber, 'account number'],
    ['Exact amount', formatMinor(v.bank.amountMinor), 'amount'],
    ['Reference (use it in the transfer note)', v.reference, 'reference'],
  ];

  async function submit() {
    if (!file) return setError(ERROR_MESSAGES.CHOOSE_TRANSFER_RECEIPT);
    const problem = checkProofFile(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    try {
      await checkoutService.uploadProof(v.reference, file);
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
    <div className="rounded-card border-line bg-paper text-ink space-y-4 border p-5">
      <h2 className="font-semibold">Transfer to this account</h2>
      <dl className="text-small space-y-3">
        {rows.map(([term, value, copy]) => (
          <div key={term} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="font-semibold wrap-break-word tabular-nums">
                {value}
              </dd>
            </div>
            {copy && <CopyButton value={value} label={copy} />}
          </div>
        ))}
      </dl>
      <AnimatePresence mode="wait" initial={false}>
        {v.proofUploaded ? (
          <motion.div
            key="uploaded"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            <p className="text-small font-medium">
              {SUCCESS_MESSAGES.TRANSFER_RECEIPT_RECEIVED}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            className="space-y-4"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          >
            <div className="space-y-2">
              <Label htmlFor="field-proof" className="font-semibold">
                Upload your receipt
              </Label>
              <Input
                ref={fileInputRef}
                id="field-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  error ? 'field-proof-error' : 'field-proof-hint'
                }
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="sr-only"
              />
              {file ? (
                <Attachment state="done" className="bg-card w-full p-3">
                  <AttachmentMedia
                    variant="icon"
                    className="bg-primary/10 text-brand-ink"
                  >
                    <FileCheck className="size-5" aria-hidden />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle className="text-small font-semibold">
                      {file.name}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready
                      to submit
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove receipt"
                      disabled={busy}
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = '';
                      }}
                    >
                      <X className="size-3.5" aria-hidden />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : (
                <label
                  htmlFor="field-proof"
                  className={cn(
                    'rounded-control border-line bg-card/60 hover:bg-card focus-within:ring-ring block w-full cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-offset-2',
                    busy && 'pointer-events-none opacity-60',
                  )}
                >
                  <Attachment state="idle" className="w-full border-dashed p-4">
                    <AttachmentMedia
                      variant="icon"
                      className="bg-primary/10 text-brand-ink"
                    >
                      <Upload className="size-5" aria-hidden />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle className="text-small font-semibold">
                        Choose receipt file
                      </AttachmentTitle>
                      <AttachmentDescription id="field-proof-hint">
                        JPG, PNG, WebP or PDF, up to{' '}
                        {MAX_PROOF_BYTES / 1024 / 1024} MB
                      </AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                </label>
              )}
              {error && (
                <p
                  id="field-proof-error"
                  className="text-small text-destructive font-medium"
                >
                  {error}
                </p>
              )}
            </div>
            <Button
              loading={busy}
              icon={<Upload className="size-4" aria-hidden />}
              onClick={submit}
            >
              Submit transfer details
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

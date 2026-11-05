'use client';

import { FileCheck, Upload, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatMinor } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MAX_PROOF_BYTES } from '@/schemas/checkout.schema';
import type { BankDetails } from '@/types/checkout.types';

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '../ui/attachment';
import { CopyButton } from '../ui/copy-button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface BankTransferCardProps {
  details: BankDetails;
  amountMinor: number;
  reference: string;
  /** Prefixes the upload control ids; must be unique on the page. */
  idPrefix: string;
  proof: {
    file: File | null;
    error: string | null;
    onFile: (f: File | null) => void;
  };
  /** Where the card sits in this page's heading outline. */
  heading?: 'h2' | 'h3' | 'h4';
  disabled?: boolean;
  /** A receipt is already on file, so the upload is replaced by that news. */
  receiptReceived?: boolean;
  action?: ReactNode;
  note?: ReactNode;
}

/**
 * The hotel's account, the exact amount and the reference, plus the receipt
 * upload. One card for checkout, a date change and the receipt page: a guest
 * who transfers pays the same way in all three, and the copy lives here once.
 */
export function BankTransferCard({
  details,
  amountMinor,
  reference,
  idPrefix,
  proof,
  heading = 'h3',
  disabled = false,
  receiptReceived = false,
  action,
  note,
}: BankTransferCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rows: [string, string, string | null][] = [
    ['Bank', details.bankName, null],
    ['Account name', details.accountName, null],
    ['Account number', details.accountNumber, 'account number'],
    ['Exact amount', formatMinor(amountMinor), 'amount'],
    ['Reference (put this in the transfer note)', reference, 'reference'],
  ];
  const Title = heading;
  return (
    <div className="space-y-4 rounded-card border border-ink/40 bg-paper p-5 text-ink">
      <Title className="font-semibold">Transfer to this account</Title>
      <dl className="space-y-3 text-small">
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

      {receiptReceived ? (
        <p className="text-small font-medium">
          {SUCCESS_MESSAGES.TRANSFER_RECEIPT_RECEIVED}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={idPrefix} className="font-semibold">
              Upload your receipt
            </Label>
            <Input
              ref={fileInputRef}
              id={idPrefix}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={disabled}
              aria-invalid={proof.error ? true : undefined}
              aria-describedby={
                proof.error ? `${idPrefix}-error` : `${idPrefix}-hint`
              }
              onChange={(e) => proof.onFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {proof.file ? (
              <Attachment state="done" className="w-full bg-card p-3">
                <AttachmentMedia
                  variant="icon"
                  className="bg-primary/10 text-brand-ink"
                >
                  <FileCheck className="size-5" aria-hidden />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle className="text-small font-semibold">
                    {proof.file.name}
                  </AttachmentTitle>
                  <AttachmentDescription>
                    {(proof.file.size / (1024 * 1024)).toFixed(2)} MB &bull;
                    Ready to submit
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove receipt"
                    disabled={disabled}
                    onClick={() => {
                      proof.onFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="size-3.5" aria-hidden />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ) : (
              <label
                htmlFor={idPrefix}
                className={cn(
                  'block w-full cursor-pointer rounded-control border-line bg-card/60 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-card',
                  disabled && 'pointer-events-none opacity-60',
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
                    <AttachmentDescription id={`${idPrefix}-hint`}>
                      JPG, PNG, WebP or PDF, up to{' '}
                      {MAX_PROOF_BYTES / 1024 / 1024} MB
                    </AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
              </label>
            )}
            {proof.error && (
              <p
                id={`${idPrefix}-error`}
                className="text-small font-medium text-destructive"
              >
                {proof.error}
              </p>
            )}
          </div>
          {action}
        </>
      )}

      {note && <p className="text-small text-ink/85">{note}</p>}
    </div>
  );
}

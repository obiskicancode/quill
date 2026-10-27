'use client';

import Link from 'next/link';
import { cn } from 'cn';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Copy,
  CreditCard,
  FileCheck,
  Landmark,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { SUCCESS_MESSAGES } from '@/constants/success-messages';
import { formatMinor } from '@/lib/format';
import { MAX_PROOF_BYTES } from '@/schemas/checkout.schema';
import type {
  BankDetails,
  ConfirmationMode,
  PaymentMethod,
  PaymentPlan,
  PaymentProvider,
} from '@/types/checkout.types';

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
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const providerNames: Record<PaymentProvider, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
};

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="min-h-11 shrink-0 gap-1.5 px-3 font-semibold"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? SUCCESS_MESSAGES.COPIED : 'Copy'}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied` : ''}
      </span>
    </>
  );
}

interface PaymentStepProps {
  payment: PaymentPlan;
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  confirmationMode: ConfirmationMode;
  terms: boolean;
  onTerms: (v: boolean) => void;
  termsError?: string;
  /** Present once the reservation exists and the guest chose bank transfer. */
  bank: { details: BankDetails; amountMinor: number; reference: string } | null;
  proof: {
    file: File | null;
    error: string | null;
    onFile: (f: File | null) => void;
  };
  disabled: boolean;
  /** The in-form primary button. Hidden on mobile, where the sticky bar holds it. */
  action: ReactNode;
}

/** Step 3. Never collects card data: "Card or USSD" opens the provider's own checkout. */
export function PaymentStep({
  payment,
  method,
  onMethod,
  confirmationMode,
  terms,
  onTerms,
  termsError,
  bank,
  proof,
  disabled,
  action,
}: PaymentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const bankMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };
  const bankTransition = { duration: reduced ? 0 : 0.25, ease: EASE_OUT };
  const atHotel = payment.mode === 'pay_at_hotel';
  const single = payment.acceptedMethods.length === 1;
  const option = (
    value: PaymentMethod,
    icon: ReactNode,
    title: string,
    text: string,
  ) => (
    <Label
      key={value}
      htmlFor={`payment-method-${value}`}
      className={cn(
        'rounded-card flex min-h-14 cursor-pointer items-start gap-3 border p-4 font-normal transition-colors',
        method === value
          ? 'border-ink bg-paper border-2'
          : 'border-ink/40 bg-card hover:bg-paper',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <RadioGroupItem
        value={value}
        id={`payment-method-${value}`}
        disabled={disabled}
        className="mt-1"
      />
      <span className="text-brand-ink mt-0.5">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-small text-muted-foreground block">{text}</span>
      </span>
    </Label>
  );

  return (
    <section
      id="step-payment"
      aria-labelledby="payment-title"
      className="space-y-5"
    >
      <h2 id="payment-title" className="font-display text-h3">
        Payment
      </h2>

      <div className="rounded-card border-line bg-card border p-5">
        {atHotel ? (
          <>
            <p className="font-display text-xl">
              Reserve now, pay at the hotel
            </p>
            <p className="text-small text-muted-foreground mt-1">
              Nothing to pay today. You pay {formatMinor(payment.totalMinor)}{' '}
              when you arrive.
            </p>
          </>
        ) : payment.mode === 'deposit' ? (
          <dl className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-semibold">Deposit, due now</dt>
              <dd className="font-display text-xl tabular-nums">
                {formatMinor(payment.dueNowMinor)}
              </dd>
            </div>
            <div className="text-small flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                Balance, due at the hotel
              </dt>
              <dd className="tabular-nums">
                {formatMinor(payment.balanceAtHotelMinor)}
              </dd>
            </div>
            <div className="border-line text-small flex items-baseline justify-between gap-4 border-t pt-2">
              <dt className="text-muted-foreground">Stay total</dt>
              <dd className="tabular-nums">
                {formatMinor(payment.totalMinor)}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold">Pay the total now</p>
            <p className="font-display text-xl tabular-nums">
              {formatMinor(payment.dueNowMinor)}
            </p>
          </div>
        )}
      </div>

      {!atHotel && (
        <div className="space-y-3">
          <p className="font-semibold">
            {single ? 'Payment method' : 'How would you like to pay?'}
          </p>
          <RadioGroup
            value={method}
            onValueChange={(val) => onMethod(val as PaymentMethod)}
            disabled={disabled}
            className="space-y-3"
          >
            {payment.acceptedMethods.includes('online') &&
              option(
                'online',
                <CreditCard className="size-5" aria-hidden />,
                'Card or USSD',
                `You will pay on ${providerNames[payment.provider]}'s secure page. We never see your card details.`,
              )}
            {payment.acceptedMethods.includes('bank_transfer') &&
              option(
                'bank_transfer',
                <Landmark className="size-5" aria-hidden />,
                'Bank transfer',
                'Transfer to the hotel and upload your receipt. We confirm once the hotel verifies it.',
              )}
          </RadioGroup>
        </div>
      )}

      {!atHotel && method === 'bank_transfer' && (
        <AnimatePresence mode="wait" initial={false}>
          {bank ? (
            <motion.div
              key="bank"
              className="rounded-card border-ink/40 bg-paper space-y-4 border p-5"
              {...bankMotion}
              transition={bankTransition}
            >
              <h3 className="font-semibold">Transfer to this account</h3>
              <dl className="text-small space-y-3">
                {[
                  ['Bank', bank.details.bankName, null],
                  ['Account name', bank.details.accountName, null],
                  [
                    'Account number',
                    bank.details.accountNumber,
                    'account number',
                  ],
                  ['Exact amount', formatMinor(bank.amountMinor), 'amount'],
                  [
                    'Reference (use this in the transfer note)',
                    bank.reference,
                    'reference',
                  ],
                ].map(([term, value, copy]) => (
                  <div
                    key={term as string}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">{term}</dt>
                      <dd className="font-semibold wrap-break-word tabular-nums">
                        {value}
                      </dd>
                    </div>
                    {copy && (
                      <CopyButton
                        value={String(value)}
                        label={copy as string}
                      />
                    )}
                  </div>
                ))}
              </dl>

              <div className="space-y-2">
                <Label htmlFor="field-proof" className="font-semibold">
                  Upload your receipt
                </Label>
                <Input
                  ref={fileInputRef}
                  id="field-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={disabled}
                  aria-invalid={proof.error ? true : undefined}
                  aria-describedby={
                    proof.error ? 'field-proof-error' : 'field-proof-hint'
                  }
                  onChange={(e) => proof.onFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                {proof.file ? (
                  <Attachment state="done" className="bg-card w-full p-3">
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
                      disabled && 'pointer-events-none opacity-60',
                    )}
                  >
                    <Attachment
                      state="idle"
                      className="w-full border-dashed p-4"
                    >
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
                {proof.error && (
                  <p
                    id="field-proof-error"
                    className="text-small text-destructive font-medium"
                  >
                    {proof.error}
                  </p>
                )}
              </div>
              <p className="text-small text-ink/85">
                {confirmationMode === 'instant'
                  ? 'Your reservation is confirmed after the hotel verifies your transfer. Until then your room stays held.'
                  : 'The hotel will verify your transfer and approve your reservation. Until then your room stays held.'}
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="note"
              className="rounded-card border-line text-small text-ink/85 border p-4"
              {...bankMotion}
              transition={bankTransition}
            >
              Continue to see the hotel&rsquo;s bank details, your exact amount
              and your booking reference. We hold your room while you transfer.
            </motion.p>
          )}
        </AnimatePresence>
      )}

      <div>
        <Label
          htmlFor="field-terms"
          className="flex cursor-pointer items-start gap-3 py-1 font-normal"
        >
          <Checkbox
            id="field-terms"
            checked={terms}
            disabled={disabled}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? 'field-terms-error' : undefined}
            onCheckedChange={(checked) => onTerms(!!checked)}
            className="mt-0.5"
          />
          <span className="text-small">
            I agree to the{' '}
            <Link
              href="/policies/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
            >
              Terms<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            ,{' '}
            <Link
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
            >
              Privacy Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>{' '}
            and{' '}
            <Link
              href="/policies/cancellation-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-brand font-semibold underline decoration-2 underline-offset-4"
            >
              Cancellation Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
            .
          </span>
        </Label>
        {termsError && (
          <p
            id="field-terms-error"
            className="text-small text-destructive mt-1.5 font-medium"
          >
            {termsError}
          </p>
        )}
      </div>

      <p className="text-caption text-muted-foreground">
        We use your details only to manage this booking, contact you about your
        stay and meet legal requirements. We do not sell them. Card payments are
        handled by the payment provider; we never store card numbers.
      </p>

      <div className="hidden lg:block">{action}</div>
    </section>
  );
}

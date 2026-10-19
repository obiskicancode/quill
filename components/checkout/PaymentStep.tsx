'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, CreditCard, Landmark, Upload } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { MAX_PROOF_BYTES } from '@/schemas/checkout.schema';
import type {
  BankDetails,
  ConfirmationMode,
  PaymentMethod,
  PaymentPlan,
  PaymentProvider,
} from '@/types/checkout.types';
import { formatMinor } from '@/types/stay.types';

import { EASE_OUT } from '../motion/variants';
import { Field } from './Field';

const providerNames: Record<PaymentProvider, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
};

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-ink/60 px-3 text-small font-semibold transition-colors hover:bg-ink hover:text-paper"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
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
    <label
      key={value}
      className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors ${method === value ? 'border-2 border-ink bg-paper' : 'border-ink/40 bg-surface hover:bg-paper'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="radio"
        name="payment-method"
        value={value}
        checked={method === value}
        disabled={disabled}
        onChange={() => onMethod(value)}
        className="mt-1 size-5 shrink-0 accent-ink"
      />
      <span className="mt-0.5 text-accent-ink">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-small text-muted">{text}</span>
      </span>
    </label>
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

      <div className="rounded-card border border-line bg-surface p-5">
        {atHotel ? (
          <>
            <p className="font-display text-xl">
              Reserve now, pay at the hotel
            </p>
            <p className="mt-1 text-small text-muted">
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
            <div className="flex items-baseline justify-between gap-4 text-small">
              <dt className="text-muted">Balance, due at the hotel</dt>
              <dd className="tabular-nums">
                {formatMinor(payment.balanceAtHotelMinor)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2 text-small">
              <dt className="text-muted">Stay total</dt>
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
        <fieldset className="space-y-3">
          <legend className="mb-2 font-semibold">
            {single ? 'Payment method' : 'How would you like to pay?'}
          </legend>
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
        </fieldset>
      )}

      {!atHotel && method === 'bank_transfer' && (
        <AnimatePresence mode="wait" initial={false}>
          {bank ? (
            <motion.div
              key="bank"
              className="space-y-4 rounded-card border border-ink/40 bg-paper p-5"
              {...bankMotion}
              transition={bankTransition}
            >
              <h3 className="font-semibold">Transfer to this account</h3>
              <dl className="space-y-3 text-small">
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
                      <dt className="text-muted">{term}</dt>
                      <dd className="break-words font-semibold tabular-nums">
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

              <Field
                id="field-proof"
                label="Upload your receipt"
                error={proof.error ?? undefined}
                hint={`JPG, PNG, WebP or PDF, up to ${MAX_PROOF_BYTES / 1024 / 1024} MB.`}
              >
                {(a) => (
                  <input
                    {...a}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={disabled}
                    onChange={(e) => proof.onFile(e.target.files?.[0] ?? null)}
                    className="block min-h-12 w-full cursor-pointer rounded-control border border-ink/60 bg-surface text-small file:mr-4 file:min-h-12 file:cursor-pointer file:border-0 file:bg-ink file:px-4 file:font-semibold file:text-paper"
                  />
                )}
              </Field>
              {proof.file && (
                <p className="flex items-center gap-2 text-small">
                  <Upload className="size-4" aria-hidden />
                  {proof.file.name}
                </p>
              )}
              <p className="text-small text-ink/85">
                {confirmationMode === 'instant'
                  ? 'Your reservation is confirmed after the hotel verifies your transfer. Until then your room stays held.'
                  : 'The hotel will verify your transfer and approve your reservation. Until then your room stays held.'}
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="note"
              className="rounded-card border border-line p-4 text-small text-ink/85"
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
        <label className="flex cursor-pointer items-start gap-3 py-1">
          <input
            id="field-terms"
            type="checkbox"
            checked={terms}
            disabled={disabled}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? 'field-terms-error' : undefined}
            onChange={(e) => onTerms(e.target.checked)}
            className="mt-0.5 size-6 shrink-0 accent-ink"
          />
          <span className="text-small">
            I agree to the{' '}
            <Link
              href="/policies/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
            >
              Terms<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            ,{' '}
            <Link
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
            >
              Privacy Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>{' '}
            and{' '}
            <Link
              href="/policies/cancellation-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-accent decoration-2 underline-offset-4"
            >
              Cancellation Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
            .
          </span>
        </label>
        {termsError && (
          <p
            id="field-terms-error"
            className="mt-1.5 text-small font-medium text-danger"
          >
            {termsError}
          </p>
        )}
      </div>

      <p className="text-caption text-muted">
        We use your details only to manage this booking, contact you about your
        stay and meet legal requirements. We do not sell them. Card payments are
        handled by the payment provider; we never store card numbers.
      </p>

      <div className="hidden lg:block">{action}</div>
    </section>
  );
}

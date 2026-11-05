'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { BankTransferCard } from '@/components/payment/BankTransferCard';
import {
  PaymentMethodPicker,
  providerNames,
} from '@/components/payment/PaymentMethodPicker';
import { TextLink } from '@/components/ui/text-link';
import { formatMinor } from '@/lib/format';
import type {
  BankDetails,
  ConfirmationMode,
  PaymentMethod,
  PaymentPlan,
} from '@/types/checkout.types';

import { EASE_OUT } from '../motion/variants';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

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

  return (
    <section
      id="step-payment"
      aria-labelledby="payment-title"
      className="space-y-5"
    >
      <h2 id="payment-title" className="font-display text-h3">
        Payment
      </h2>

      <div className="rounded-card border border-line bg-card p-5">
        {atHotel ? (
          <>
            <p className="font-display text-figure-sm">
              Reserve now, pay at the hotel
            </p>
            <p className="mt-1 text-small text-muted-foreground">
              Nothing to pay today. You pay {formatMinor(payment.totalMinor)}{' '}
              when you arrive.
            </p>
          </>
        ) : payment.mode === 'deposit' ? (
          <dl className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-semibold">Deposit, due now</dt>
              <dd className="font-display text-figure-sm tabular-nums">
                {formatMinor(payment.dueNowMinor)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-small">
              <dt className="text-muted-foreground">
                Balance, due at the hotel
              </dt>
              <dd className="tabular-nums">
                {formatMinor(payment.balanceAtHotelMinor)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2 text-small">
              <dt className="text-muted-foreground">Stay total</dt>
              <dd className="tabular-nums">
                {formatMinor(payment.totalMinor)}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold">Pay the total now</p>
            <p className="font-display text-figure-sm tabular-nums">
              {formatMinor(payment.dueNowMinor)}
            </p>
          </div>
        )}
      </div>

      {!atHotel && (
        <PaymentMethodPicker
          methods={payment.acceptedMethods}
          value={method}
          onMethod={onMethod}
          providerName={providerNames[payment.provider]}
          idPrefix="payment-method"
          disabled={disabled}
        />
      )}

      {!atHotel && method === 'bank_transfer' && (
        <AnimatePresence mode="wait" initial={false}>
          {bank ? (
            <motion.div key="bank" {...bankMotion} transition={bankTransition}>
              <BankTransferCard
                details={bank.details}
                amountMinor={bank.amountMinor}
                reference={bank.reference}
                idPrefix="field-proof"
                proof={proof}
                disabled={disabled}
                note={
                  confirmationMode === 'instant'
                    ? 'Your reservation is confirmed after the hotel verifies your transfer. Until then your room stays held.'
                    : 'The hotel will verify your transfer and approve your reservation. Until then your room stays held.'
                }
              />
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
            <TextLink href="/policies/terms" external>
              Terms<span className="sr-only"> (opens in a new tab)</span>
            </TextLink>
            ,{' '}
            <TextLink href="/policies/privacy" external>
              Privacy Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </TextLink>{' '}
            and{' '}
            <TextLink href="/policies/cancellation-policy" external>
              Cancellation Policy
              <span className="sr-only"> (opens in a new tab)</span>
            </TextLink>
            .
          </span>
        </Label>
        {termsError && (
          <p
            id="field-terms-error"
            role="alert"
            className="mt-1.5 text-small font-medium text-destructive"
          >
            {termsError}
          </p>
        )}
      </div>

      <p className="text-small text-muted-foreground">
        We use your details only to manage this booking, contact you about your
        stay and meet legal requirements. We do not sell them. Card payments are
        handled by the payment provider; we never store card numbers.
      </p>

      <div className="hidden lg:block">{action}</div>
    </section>
  );
}

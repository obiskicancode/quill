'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { BankTransferCard } from '@/components/payment/BankTransferCard';
import { PaymentMethodPicker } from '@/components/payment/PaymentMethodPicker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  useInitChangePayment,
  useUploadChangeProof,
} from '@/hooks/services/guest/use-manage';
import { formatCountdown, formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { checkProofFile } from '@/schemas/checkout.schema';
import type { PaymentMethod } from '@/types/checkout.types';
import type { PendingChangeView } from '@/types/manage.types';

import { useHoldCountdown } from '../checkout/useHoldCountdown';
import { EASE_OUT } from '../motion/variants';

interface ChangePaymentProps {
  reference: string;
  change: PendingChangeView;
  csrf: string;
  /** Reloads the booking so the new status shows. */
  onRefresh: () => Promise<void>;
  onSessionExpired: () => void;
}
/**
 * The payment step for a date change. It reuses the checkout payment endpoint (card or USSD, or bank transfer).
 * The new dates are held while the guest pays; the old dates stay valid until the payment is complete.
 */
export function ChangePayment({
  reference,
  change,
  csrf,
  onRefresh,
  onSessionExpired,
}: ChangePaymentProps) {
  const initChangePayment = useInitChangePayment();
  const uploadChangeProof = useUploadChangeProof();
  const [method, setMethod] = useState<PaymentMethod>(
    change.acceptedMethods[0] ?? 'online',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const key = useRef(newKey());
  const hold = useHoldCountdown(Date.parse(change.holdExpiresAt), 0);
  const reduced = useReducedMotion();
  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: EASE_OUT },
      };
  function fail(e: unknown) {
    const f = e instanceof ServiceError ? e : null;
    if (f?.body?.code === ERROR_CODES.SESSION_EXPIRED)
      return onSessionExpired();
    if (f?.body?.code === ERROR_CODES.PAYMENT_INIT_FAILED) {
      key.current = newKey();
      setError(f.body.message ?? ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE);
      void onRefresh();
      return;
    }
    if (!f || f.network || f.status >= 500)
      setError(ERROR_MESSAGES.COULD_NOT_REACH_SERVER_PAYMENT_UNKNOWN);
    else {
      key.current = newKey();
      setError(f.body?.message ?? ERROR_MESSAGES.SOMETHING_WENT_WRONG_SHORT);
    }
  }
  async function pay() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const init = await initChangePayment.mutateAsync({
        reference,
        body: {
          changeId: change.changeId,
          method,
          idempotencyKey: key.current,
        },
        csrf,
      });
      if (init.kind === 'redirect') {
        window.location.assign(init.url); // the provider's hosted checkout. Only its verified webhook confirms the payment.
        return;
      }
      key.current = newKey();
      await onRefresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function sendProof() {
    if (!file) return setFileError(ERROR_MESSAGES.CHOOSE_TRANSFER_RECEIPT);
    const problem = checkProofFile(file);
    if (problem) return setFileError(problem);
    setFileError(null);
    setBusy(true);
    try {
      await uploadChangeProof.mutateAsync({
        reference,
        changeId: change.changeId,
        file,
        csrf,
      });
      await onRefresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const choosing =
    change.method === null && change.status === 'awaiting_payment';
  const holdLine = hold.expired
    ? ERROR_MESSAGES.HOLD_ENDED_UNCHANGED
    : `We're holding your new dates (${formatRange(change.checkIn, change.checkOut)}): ${formatCountdown(hold.remainingMs ?? 0)}. Your current dates stay valid until the payment is complete.`;
  const statusKey =
    change.status === 'awaiting_verification'
      ? 'verification'
      : change.status === 'awaiting_payment' && !choosing
        ? 'confirming'
        : change.status === 'awaiting_transfer' && change.bank
          ? 'transfer'
          : 'choose';
  return (
    <section aria-labelledby="change-pay-title" className="space-y-4">
      <h3 id="change-pay-title" className="font-semibold">
        Pay {formatMinor(change.amountDueMinor)} for your new dates
      </h3>
      <p
        role="status"
        className={`rounded-control p-3 text-small ${hold.expiring ? 'bg-destructive/5 font-semibold text-destructive' : 'bg-paper'}`}
      >
        {holdLine}
      </p>
      {change.status === 'payment_failed' && (
        <Alert role="alert" variant="destructive" size="banner">
          <AlertTitle>{"The payment didn't go through"}</AlertTitle>
          <AlertDescription>
            <p>
              Your current dates are unchanged. You can try again while the hold
              lasts.
            </p>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert role="alert" variant="destructive" size="banner">
          <AlertTitle>That did not go through</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={statusKey} {...panelMotion}>
          {change.status === 'awaiting_verification' ? (
            <Alert role="status" variant="neutral" size="banner">
              <AlertTitle>Awaiting verification</AlertTitle>
              <AlertDescription>
                <p>
                  We have your receipt. The hotel verifies it, then your new
                  dates take effect. Your current dates stay valid until then.
                </p>
              </AlertDescription>
            </Alert>
          ) : change.status === 'awaiting_payment' && !choosing ? (
            <Alert role="status" variant="neutral" size="banner">
              <AlertTitle>Confirming your payment</AlertTitle>
              <AlertDescription>
                <p>
                  Please keep this page open. It updates by itself when your
                  payment provider confirms.
                </p>
              </AlertDescription>
            </Alert>
          ) : change.status === 'awaiting_transfer' && change.bank ? (
            <BankTransferCard
              details={change.bank.details}
              amountMinor={change.bank.amountMinor}
              reference={reference}
              idPrefix="change-proof"
              heading="h4"
              proof={{
                file,
                error: fileError,
                onFile: (f) => {
                  setFile(f);
                  setFileError(null);
                },
              }}
              disabled={busy || hold.expired}
              action={
                <Button
                  loading={busy}
                  icon={<Upload className="size-4" aria-hidden />}
                  disabled={hold.expired}
                  onClick={sendProof}
                >
                  Submit transfer details
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <PaymentMethodPicker
                methods={change.acceptedMethods}
                value={method}
                onMethod={setMethod}
                providerName={change.providerName}
                idPrefix="change-method"
                disabled={busy}
              />
              <Button
                size="lg"
                className="w-full"
                loading={busy}
                disabled={hold.expired}
                onClick={pay}
              >
                {method === 'bank_transfer'
                  ? 'Continue to bank details'
                  : `Pay ${formatMinor(change.amountDueMinor)}`}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

'use client';

import { cn } from 'cn';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CreditCard, FileCheck, Landmark, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  useInitChangePayment,
  useUploadChangeProof,
} from '@/hooks/services/guest/use-manage';
import { formatCountdown, formatMinor } from '@/lib/format';
import { formatRange } from '@/lib/rooms';
import { checkProofFile, MAX_PROOF_BYTES } from '@/schemas/checkout.schema';
import type { PaymentMethod } from '@/types/checkout.types';
import type { PendingChangeView } from '@/types/manage.types';

import { Banner } from '../checkout/CheckoutStates';
import { CopyButton } from '../checkout/PaymentStep';
import { useHoldCountdown } from '../checkout/useHoldCountdown';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        className={`rounded-control text-small p-3 ${hold.expiring ? 'bg-destructive/5 text-destructive font-semibold' : 'bg-paper'}`}
      >
        {holdLine}
      </p>

      {change.status === 'payment_failed' && (
        <Banner
          role="alert"
          tone="danger"
          title="The payment didn't go through"
        >
          <p>
            Your current dates are unchanged. You can try again while the hold
            lasts.
          </p>
        </Banner>
      )}
      {error && (
        <Banner role="alert" tone="danger" title="That did not go through">
          <p>{error}</p>
        </Banner>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={statusKey} {...panelMotion}>
          {change.status === 'awaiting_verification' ? (
            <Banner tone="info" title="Awaiting verification">
              <p>
                We have your receipt. The hotel verifies it, then your new dates
                take effect. Your current dates stay valid until then.
              </p>
            </Banner>
          ) : change.status === 'awaiting_payment' && !choosing ? (
            <Banner tone="info" title="Confirming your payment">
              <p>
                Please keep this page open. It updates by itself when your
                payment provider confirms.
              </p>
            </Banner>
          ) : change.status === 'awaiting_transfer' && change.bank ? (
            <div className="rounded-card border-line bg-paper text-small space-y-4 border p-4">
              <p className="font-semibold">Transfer to this account</p>
              <dl className="space-y-3">
                {(
                  [
                    ['Bank', change.bank.details.bankName, null],
                    ['Account name', change.bank.details.accountName, null],
                    [
                      'Account number',
                      change.bank.details.accountNumber,
                      'account number',
                    ],
                    [
                      'Exact amount',
                      formatMinor(change.bank.amountMinor),
                      'amount',
                    ],
                    ['Reference', reference, 'reference'],
                  ] as [string, string, string | null][]
                ).map(([term, value, copy]) => (
                  <div
                    key={term}
                    className="flex items-center justify-between gap-3"
                  >
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
              <div className="space-y-2">
                <Label htmlFor="change-proof" className="font-semibold">
                  Upload your receipt
                </Label>
                <Input
                  ref={fileInputRef}
                  id="change-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  aria-invalid={fileError ? true : undefined}
                  aria-describedby={
                    fileError ? 'change-proof-error' : 'change-proof-hint'
                  }
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setFileError(null);
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
                    htmlFor="change-proof"
                    className={cn(
                      'rounded-control border-line bg-card/60 hover:bg-card focus-within:ring-ring block w-full cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-offset-2',
                      (busy || hold.expired) &&
                        'pointer-events-none opacity-60',
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
                        <AttachmentDescription id="change-proof-hint">
                          JPG, PNG, WebP or PDF, up to{' '}
                          {MAX_PROOF_BYTES / 1024 / 1024} MB
                        </AttachmentDescription>
                      </AttachmentContent>
                    </Attachment>
                  </label>
                )}
                {fileError && (
                  <p
                    id="change-proof-error"
                    className="text-small text-destructive font-medium"
                  >
                    {fileError}
                  </p>
                )}
              </div>
              <Button
                loading={busy}
                icon={<Upload className="size-4" aria-hidden />}
                disabled={hold.expired}
                onClick={sendProof}
              >
                Submit transfer details
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="font-semibold">How would you like to pay?</p>
                <RadioGroup
                  value={method}
                  onValueChange={(val) => setMethod(val as PaymentMethod)}
                  className="space-y-3"
                >
                  {change.acceptedMethods.map((m) => (
                    <Label
                      key={m}
                      htmlFor={`change-method-${m}`}
                      className={cn(
                        'rounded-card flex min-h-14 cursor-pointer items-start gap-3 border p-4 font-normal transition-colors',
                        method === m
                          ? 'border-ink bg-paper border-2'
                          : 'border-ink/40 bg-card hover:bg-paper',
                      )}
                    >
                      <RadioGroupItem
                        value={m}
                        id={`change-method-${m}`}
                        className="mt-1"
                      />
                      <span className="text-brand-ink mt-0.5">
                        {m === 'online' ? (
                          <CreditCard className="size-5" aria-hidden />
                        ) : (
                          <Landmark className="size-5" aria-hidden />
                        )}
                      </span>
                      <span>
                        <span className="block font-semibold">
                          {m === 'online' ? 'Card or USSD' : 'Bank transfer'}
                        </span>
                        <span className="text-small text-muted-foreground block">
                          {m === 'online'
                            ? `Pay on ${change.providerName}'s secure page. We never see your card details.`
                            : 'Transfer to the hotel and upload your receipt.'}
                        </span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
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

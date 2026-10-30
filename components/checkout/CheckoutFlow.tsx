'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  useCheckoutQuote,
  useCheckoutStatus,
  useCreateReservation,
  useInitPayment,
  useUploadProof,
} from '@/hooks/services/guest/use-checkout';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formatMinor } from '@/lib/format';
import {
  checkProofFile,
  guestSchema,
  type GuestDetails,
  type GuestInput,
  type ReservationRequestInput,
} from '@/schemas/checkout.schema';
import type {
  BankDetails,
  CheckoutQuoteOk,
  CheckoutQuoteResponse,
  PaymentMethod,
  ReservationRoomSummary,
} from '@/types/checkout.types';

import { EASE_OUT } from '../motion/variants';
import { Button } from '../ui/button';
import {
  Banner,
  ConfirmingScreen,
  ExpiredPanel,
  ExpiringBanner,
  FailedPanel,
  NetworkErrorBanner,
  PriceUpdatedPanel,
  RequestReceivedScreen,
  TransferSubmittedScreen,
  UnavailableState,
} from './CheckoutStates';
import { DetailsStep, type GuestField } from './DetailsStep';
import { ExtrasStep } from './ExtrasStep';
import { PaymentStep } from './PaymentStep';
import { ProgressSteps, type StepInfo } from './ProgressSteps';
import { MobileSummary, SummaryCard } from './SummaryCard';
import { useHoldCountdown } from './useHoldCountdown';

const POLL_TIMEOUT_MS = 30_000;
const TERMS_MESSAGE = ERROR_MESSAGES.TERMS_ACCEPTANCE_REQUIRED;

type Phase =
  | { name: 'form' }
  | { name: 'redirecting' }
  | { name: 'confirming' }
  | { name: 'failed'; reason: 'failed' | 'cancelled' }
  | { name: 'transfer-submitted' }
  | { name: 'request-received'; reason: 'pay_at_hotel' | 'manual' };

interface ReservationState {
  reference: string;
  holdExpiresAt: number;
  skewMs: number;
}

interface CheckoutFlowProps {
  room: ReservationRoomSummary & { slug: string };
  stay: { checkIn: string; checkOut: string; adults: number; children: number };
  initialQuote: CheckoutQuoteResponse;
  seenTotalMinor: number | null;
  resumeReference: string | null;
  hotelTimes: { checkIn: string; checkOut: string };
}

export function CheckoutFlow({
  room,
  stay,
  initialQuote,
  resumeReference,
  hotelTimes,
}: CheckoutFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const form = useForm<GuestInput, unknown, GuestDetails>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullName: '',
      email: '',
      country: 'NG',
      phone: '',
      arrivalTime: '',
      specialRequests: '',
    },
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(
    form,
    `checkout:${room.slug}:${stay.checkIn}:${stay.checkOut}:${stay.adults}:${stay.children}`,
  );
  const {
    formState: { errors: formErrors },
    setError: setGuestError,
    setValue,
    trigger,
    watch,
  } = form;
  const values = watch();
  const quoteMutation = useCheckoutQuote();
  const createReservation = useCreateReservation();
  const initPayment = useInitPayment();
  const uploadProof = useUploadProof();
  const bannerMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };
  const bannerTransition = { duration: reduced ? 0 : 0.2, ease: EASE_OUT };

  // --- quote (always from the server) ---
  const [quote, setQuote] = useState<CheckoutQuoteResponse>(initialQuote);
  const quoteLoading = quoteMutation.isPending;
  const [quoteFailed, setQuoteFailed] = useState(false);
  // A guest returning from the payment provider has already accepted the price.
  const resumed = resumeReference !== null;
  const [accepted, setAccepted] = useState(resumed);
  const ok: CheckoutQuoteOk | null = quote.status === 'ok' ? quote : null;
  const priceChange = ok?.priceChange && !accepted ? ok.priceChange : null;

  // --- form ---
  const [terms, setTerms] = useState(resumed);
  const [termsError, setTermsError] = useState<string | undefined>();
  const [website, setWebsite] = useState('');
  const [extraBed, setExtraBed] = useState(ok?.extraBed.selected ?? false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>(
    ok?.payment.acceptedMethods[0] ?? 'online',
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // --- reservation and payment ---
  const [phase, setPhase] = useState<Phase>(
    resumeReference ? { name: 'confirming' } : { name: 'form' },
  );
  const [reservation, setReservation] = useState<ReservationState | null>(
    resumeReference
      ? { reference: resumeReference, holdExpiresAt: 0, skewMs: 0 }
      : null,
  );
  const [bank, setBank] = useState<{
    details: BankDetails;
    amountMinor: number;
    reference: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [netError, setNetError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const statusQuery = useCheckoutStatus(
    reservation?.reference ?? null,
    phase.name === 'confirming' && !timedOut,
  );
  const status = statusQuery.data;

  const submitting = useRef(false);
  const reserveKey = useRef(newKey()); // generated when the page loads
  const payKey = useRef<string | null>(null);

  const inForm = phase.name === 'form' || phase.name === 'failed';
  const holdActive =
    reservation !== null && reservation.holdExpiresAt > 0 && inForm;
  const hold = useHoldCountdown(
    holdActive ? reservation.holdExpiresAt : null,
    reservation?.skewMs ?? 0,
  );
  const expired = holdActive && hold.expired;
  const locked = reservation !== null;

  const guests = stay.adults + stay.children;
  const catalog = ok?.extrasCatalog ?? [];
  const showExtras =
    catalog.length > 0 || Boolean(ok?.extraBed.needed && ok.extraBed.available);
  const selections = Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => ({ id, quantity }));
  const lineTotals = Object.fromEntries(
    (ok?.breakdown.extras ?? []).map((l) => [l.id, l.totalMinor]),
  );

  const checkoutHref = useCallback(
    (range: { checkIn: string; checkOut: string }) => {
      const p = new URLSearchParams({
        room: room.slug,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        adults: String(stay.adults),
        children: String(stay.children),
      });
      return `/checkout?${p.toString()}`;
    },
    [room.slug, stay.adults, stay.children],
  );
  const staySearch = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
    children: String(stay.children),
  }).toString();
  const confirmationHref = (ref: string) =>
    `/booking/confirmation?ref=${encodeURIComponent(ref)}`;

  const quoteRequest = useCallback(
    () => ({
      room: room.slug,
      ...stay,
      extraBed,
      extras: selections,
      seenTotalMinor: null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.slug, stay, extraBed, quantities],
  );

  // --- live re-quote when extras or the extra bed change ---
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (reservation || quote.status !== 'ok') return;
    const timer = window.setTimeout(async () => {
      setQuoteFailed(false);
      setAccepted(true);
      try {
        setQuote(await quoteMutation.mutateAsync(quoteRequest()));
      } catch {
        setQuoteFailed(true);
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraBed, quantities]);

  // --- polling after the guest returns from the provider (only the verified webhook changes the status) ---
  useEffect(() => {
    if (phase.name !== 'confirming' || !reservation) return;
    const timer = window.setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name, pollNonce, reservation?.reference]);

  useEffect(() => {
    if (!status || !reservation) return;
    setReservation({
      reference: reservation.reference,
      holdExpiresAt: Date.parse(status.holdExpiresAt),
      skewMs: Date.parse(status.serverTime) - Date.now(),
    });
    if (status.status === 'confirmed')
      return router.push(confirmationHref(reservation.reference));
    if (status.status === 'pending_approval')
      return setPhase({ name: 'request-received', reason: 'manual' });
    if (status.status === 'expired') {
      setReservation(null);
      setPhase({ name: 'form' });
      router.replace(checkoutHref(stay));
      return;
    }
    if (
      status.status === 'awaiting_transfer' ||
      status.status === 'awaiting_verification' ||
      status.status === 'reserved_pay_at_hotel' ||
      status.status === 'checked_in' ||
      status.status === 'checked_out' ||
      status.status === 'no_show'
    )
      return router.push(confirmationHref(reservation.reference));
    if (status.status === 'payment_failed' || status.paymentStatus === 'failed')
      return setPhase({ name: 'failed', reason: 'failed' });
    if (status.status === 'cancelled' || status.paymentStatus === 'cancelled')
      return setPhase({ name: 'failed', reason: 'cancelled' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // --- validation ---
  const detailsValid = resumed || guestSchema.safeParse(values).success;
  const detailsErrors = Object.fromEntries(
    Object.entries(formErrors).map(([field, error]) => [field, error?.message]),
  ) as Partial<Record<GuestField, string>>;

  const onChange = (name: GuestField, value: string) => {
    const shouldValidate =
      form.formState.isSubmitted ||
      Boolean(formErrors[name]) ||
      (name === 'country' && Boolean(formErrors.phone));
    setValue(name, value, { shouldDirty: true, shouldValidate });
    if (name === 'country' && values.phone) void trigger('phone');
  };
  const onBlur = (name: GuestField) => {
    if (name === 'specialRequests' && !values.specialRequests) return;
    void trigger(name);
  };

  // --- actions ---
  function handleFailure(err: unknown) {
    const fail = err instanceof ServiceError ? err : null;
    const body = fail?.body;
    if (!fail || fail.network || fail.status >= 500) {
      setNetError(ERROR_MESSAGES.COULD_NOT_REACH_SERVER_UNKNOWN_OUTCOME);
      return;
    }
    payKey.current = null;
    if (body?.code === ERROR_CODES.VALIDATION && body.fieldErrors) {
      let termsMsg: string | undefined;
      for (const [key, message] of Object.entries(body.fieldErrors)) {
        if (key.startsWith('guest.'))
          setGuestError(key.slice(6) as GuestField, {
            type: 'server',
            message,
          });
        if (key === 'termsAccepted') termsMsg = message;
      }
      setTermsError(termsMsg);
    } else if (body?.code === ERROR_CODES.UNAVAILABLE && body.quote) {
      setQuote(body.quote as CheckoutQuoteResponse);
    } else if (body?.code === ERROR_CODES.PRICE_CHANGED && body.quote) {
      setQuote(body.quote as CheckoutQuoteResponse);
      setAccepted(false);
    } else if (body?.code === ERROR_CODES.HOLD_EXPIRED) {
      setReservation((r) => (r ? { ...r, holdExpiresAt: Date.now() - 1 } : r));
    } else {
      setNetError(body?.message ?? ERROR_MESSAGES.SOMETHING_WENT_WRONG);
    }
  }

  async function startPayment(reference: string) {
    const key = (payKey.current ??= newKey());
    const init = await initPayment.mutateAsync({
      reference,
      method,
      idempotencyKey: key,
    });
    if (init.kind === 'redirect') {
      setPhase({ name: 'redirecting' });
      window.location.assign(init.url); // the provider's hosted checkout. Confirmation comes only from its webhook.
      return;
    }
    payKey.current = null;
    setBank({
      details: init.bank,
      amountMinor: init.amountMinor,
      reference: init.reference,
    });
    setPhase({ name: 'form' });
  }

  async function submitProof(reference: string) {
    if (!proofFile) {
      setProofError(ERROR_MESSAGES.CHOOSE_TRANSFER_RECEIPT);
      document.getElementById('field-proof')?.focus();
      return;
    }
    const problem = checkProofFile(proofFile);
    if (problem) {
      setProofError(problem);
      document.getElementById('field-proof')?.focus();
      return;
    }
    setProofError(null);
    await uploadProof.mutateAsync({ reference, file: proofFile });
    setPhase({ name: 'transfer-submitted' });
  }

  async function submitResolved(guest: GuestDetails | null) {
    if (submitting.current || !ok || quoteLoading || priceChange || expired)
      return;
    let current = reservation;

    // Once the reservation exists its details and terms are already saved, so only a new reservation is validated.
    if (!current) {
      const termsMessage = terms ? undefined : TERMS_MESSAGE;
      setTermsError(termsMessage);
      if (termsMessage) return;
    }

    submitting.current = true;
    setBusy(true);
    setNetError(null);
    try {
      if (!current) {
        const body: ReservationRequestInput = {
          idempotencyKey: reserveKey.current,
          room: room.slug,
          ...stay,
          extraBed,
          extras: selections,
          guest: guest ?? (form.getValues() as GuestDetails),
          expectedTotalMinor: ok.breakdown.totalMinor,
          termsAccepted: true,
          website,
        };
        const res = await createReservation.mutateAsync(body);
        current = {
          reference: res.reference,
          holdExpiresAt: Date.parse(res.holdExpiresAt),
          skewMs: Date.parse(res.serverTime) - Date.now(),
        };
        setReservation(current);
        clearDraft();
      }
      if (ok.payment.mode === 'pay_at_hotel') {
        router.push(confirmationHref(current.reference));
        return;
      } else if (method === 'bank_transfer' && bank) {
        await submitProof(current.reference);
      } else {
        await startPayment(current.reference);
      }
    } catch (err) {
      handleFailure(err);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const submit = () => {
    if (reservation) {
      void submitResolved(null);
      return;
    }
    void form.handleSubmit(submitResolved)();
  };

  async function restart() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      reserveKey.current = newKey();
      payKey.current = null;
      setReservation(null);
      setBank(null);
      setProofFile(null);
      setNetError(null);
      setTimedOut(false);
      setPhase({ name: 'form' });
      router.replace(checkoutHref(stay));
      setAccepted(true);
      setQuote(await quoteMutation.mutateAsync(quoteRequest()));
    } catch {
      setNetError(ERROR_MESSAGES.COULD_NOT_RECHECK_AVAILABILITY);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const retryPayment = () => {
    payKey.current = null;
    setPhase({ name: 'form' });
    window.setTimeout(() => void submit(), 0);
  };

  const switchMethod = () => {
    payKey.current = null;
    setBank(null);
    setPhase({ name: 'form' });
    document.getElementById('step-payment')?.scrollIntoView({ block: 'start' });
  };

  function chooseMethod(next: PaymentMethod) {
    setMethod(next);
    if (next !== 'bank_transfer') setBank(null);
    payKey.current = null;
  }

  // --- full-width states ---
  if (quote.status === ERROR_CODES.UNAVAILABLE) {
    return (
      <div className="container-page py-8 md:py-12">
        <UnavailableState
          room={room}
          stay={stay}
          suggestions={quote.suggestions}
          hrefFor={checkoutHref}
          similarHref={`/rooms?${staySearch}`}
        />
      </div>
    );
  }
  if (!ok) {
    return (
      <div className="container-page py-8 md:py-12">
        <Banner
          role="alert"
          tone="danger"
          title={ERROR_MESSAGES.COULD_NOT_OPEN_CHECKOUT}
        >
          <p>{quote.status === 'invalid' ? quote.message : ''}</p>
        </Banner>
      </div>
    );
  }

  const payment = ok.payment;
  const redirecting = phase.name === 'redirecting';
  const disabledAction =
    busy || redirecting || quoteLoading || expired || Boolean(priceChange);
  const label = busy
    ? 'Processing'
    : redirecting
      ? 'Opening secure payment'
      : payment.mode === 'pay_at_hotel'
        ? 'Reserve now'
        : method === 'bank_transfer'
          ? bank
            ? 'Submit transfer details'
            : 'Continue to bank details'
          : payment.mode === 'deposit'
            ? `Pay deposit ${formatMinor(payment.dueNowMinor)}`
            : `Pay ${formatMinor(payment.dueNowMinor)}`;

  const action = (
    <Button
      type="submit"
      form="checkout-form"
      size="lg"
      className="w-full"
      loading={busy || redirecting}
      disabled={disabledAction}
    >
      {label}
    </Button>
  );

  const steps: StepInfo[] = [
    {
      id: 'details',
      label: 'Your details',
      state: detailsValid ? 'complete' : 'current',
    },
    ...(showExtras
      ? [
          {
            id: 'extras',
            label: 'Extras',
            state: (detailsValid
              ? 'complete'
              : 'upcoming') as StepInfo['state'],
          },
        ]
      : []),
    {
      id: 'payment',
      label: 'Payment',
      state: detailsValid ? 'current' : 'upcoming',
    },
  ];

  const summaryProps = {
    room,
    stay,
    quote: quoteLoading ? null : ok,
    hotelTimes,
    holdSeconds: ok.holdSeconds,
    confirmationMode: ok.confirmationMode,
    hold: holdActive
      ? {
          remainingMs: hold.remainingMs,
          expiring: hold.expiring,
          expired: hold.expired,
        }
      : null,
  };

  let main: React.ReactNode;
  if (phase.name === 'confirming') {
    main = (
      <ConfirmingScreen
        timedOut={timedOut}
        checking={false}
        onCheckAgain={() => {
          setTimedOut(false);
          setPollNonce((n) => n + 1);
        }}
      />
    );
  } else if (phase.name === 'transfer-submitted' && reservation) {
    main = (
      <TransferSubmittedScreen
        reference={reservation.reference}
        confirmationHref={confirmationHref(reservation.reference)}
      />
    );
  } else if (phase.name === 'request-received' && reservation) {
    main = (
      <RequestReceivedScreen
        reason={phase.reason}
        reference={reservation.reference}
        confirmationHref={confirmationHref(reservation.reference)}
      />
    );
  } else if (redirecting) {
    main = (
      <Banner tone="info" title="Taking you to the secure payment page">
        <p className="flex items-center gap-2">
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          Please do not close this page.
        </p>
      </Banner>
    );
  } else if (priceChange) {
    main = (
      <PriceUpdatedPanel
        previousMinor={priceChange.previousTotalMinor}
        currentMinor={priceChange.currentTotalMinor}
        onAccept={() => setAccepted(true)}
        changeHref={`/rooms/${room.slug}?${staySearch}`}
      />
    );
  } else {
    main = (
      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {expired && (
            <motion.div
              key="expired"
              {...bannerMotion}
              transition={bannerTransition}
            >
              <ExpiredPanel onRestart={restart} busy={busy} />
            </motion.div>
          )}
          {!expired && hold.expiring && holdActive && (
            <motion.div
              key="expiring"
              {...bannerMotion}
              transition={bannerTransition}
            >
              <ExpiringBanner />
            </motion.div>
          )}
          {phase.name === 'failed' && !expired && (
            <motion.div
              key="failed"
              {...bannerMotion}
              transition={bannerTransition}
            >
              <FailedPanel
                reason={phase.reason}
                holdActive={holdActive}
                onRetry={retryPayment}
                onSwitch={switchMethod}
                busy={busy}
              />
            </motion.div>
          )}
          {netError && (
            <motion.div
              key="net"
              {...bannerMotion}
              transition={bannerTransition}
            >
              <NetworkErrorBanner
                message={netError}
                onRetry={() => void submit()}
                busy={busy}
              />
            </motion.div>
          )}
          {quoteFailed && (
            <motion.div
              key="quotefailed"
              {...bannerMotion}
              transition={bannerTransition}
            >
              <Banner
                role="alert"
                tone="danger"
                title={ERROR_MESSAGES.COULD_NOT_UPDATE_PRICE}
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setQuoteFailed(false)}
                  >
                    Dismiss
                  </Button>
                }
              >
                <p>
                  Your last change may not be included in the total. Change it
                  again to retry.
                </p>
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          id="checkout-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="space-y-10"
        >
          {locked && !expired && (
            <p className="rounded-control bg-paper text-small flex flex-wrap items-center justify-between gap-3 p-4">
              <span>
                Your details are locked while we hold your room. To change them,
                start again.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={restart}
                loading={busy}
              >
                Start again
              </Button>
            </p>
          )}
          {resumed && (
            <p className="rounded-control bg-paper text-small p-4">
              Your details are saved and your room is held. Choose how to pay
              below.
            </p>
          )}
          <fieldset
            disabled={locked || expired}
            hidden={resumed}
            className="min-w-0 space-y-10 border-0 p-0"
          >
            <legend className="sr-only">Your details and extras</legend>
            <DetailsStep
              values={values}
              errors={detailsErrors}
              disabled={locked || expired}
              onChange={onChange}
              onBlur={onBlur}
              stay={stay}
              editHref={`/rooms/${room.slug}?${staySearch}`}
              website={website}
              onWebsite={setWebsite}
            />
            {showExtras && (
              <ExtrasStep
                catalog={catalog}
                quantities={quantities}
                lineTotals={lineTotals}
                guests={guests}
                disabled={locked || expired}
                onQuantity={(id, q) =>
                  setQuantities((s) => ({ ...s, [id]: q }))
                }
                extraBed={{ ...ok.extraBed, selected: extraBed }}
                onExtraBed={setExtraBed}
              />
            )}
          </fieldset>
          <PaymentStep
            payment={payment}
            method={method}
            onMethod={chooseMethod}
            confirmationMode={ok.confirmationMode}
            terms={terms}
            onTerms={(v) => {
              setTerms(v);
              if (v) setTermsError(undefined);
            }}
            termsError={termsError}
            bank={bank}
            proof={{
              file: proofFile,
              error: proofError,
              onFile: (f) => {
                setProofFile(f);
                setProofError(null);
              },
            }}
            disabled={expired}
            action={action}
          />
        </form>
      </div>
    );
  }

  const showBar = inForm && !priceChange && !expired;

  const mainKey = priceChange ? 'price-change' : phase.name;
  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };
  const panelTransition = { duration: reduced ? 0 : 0.25, ease: EASE_OUT };

  return (
    <div className="container-page py-8 md:py-12">
      <p aria-live="polite" className="sr-only">
        {hold.announcement}
      </p>
      {inForm && !priceChange && (
        <div className="mb-8 space-y-6">
          <h1 className="font-display text-h2">Complete your booking</h1>
          <ProgressSteps steps={steps} />
        </div>
      )}
      <div className="mb-6">
        <MobileSummary {...summaryProps} />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-12">
        <div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mainKey}
              {...panelMotion}
              transition={panelTransition}
            >
              {main}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside
          aria-label="Booking summary"
          className="hidden lg:sticky lg:top-6 lg:block"
        >
          <SummaryCard {...summaryProps} />
        </aside>
      </div>

      {showBar && (
        <div className="border-line bg-paper/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pr-22 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <p className="text-small shrink-0">
              <span className="text-muted-foreground block">
                {payment.mode === 'pay_at_hotel' ? 'Pay at hotel' : 'Due now'}
              </span>
              <span className="font-semibold tabular-nums">
                {formatMinor(
                  payment.mode === 'pay_at_hotel'
                    ? payment.totalMinor
                    : payment.dueNowMinor,
                )}
              </span>
            </p>
            <div className="min-w-0 flex-1">{action}</div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';
import { newKey } from '@/app/api/services/checkout.service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ActionBarAmount,
  MobileActionBar,
} from '@/components/ui/mobile-action-bar';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import {
  useCheckoutQuote,
  useCheckoutStatus,
  useCreateReservation,
  useInitPayment,
  useUpdateHold,
  useUploadProof,
} from '@/hooks/services/guest/use-checkout';
import { useFormDraft } from '@/hooks/use-form-draft';
import {
  getWebStorageValue,
  removeWebStorageValue,
  setWebStorageValue,
  useWebStorage,
} from '@/hooks/use-web-storage';
import { formatMinor } from '@/lib/format';
import {
  checkProofFile,
  guestSchema,
  type GuestDetails,
  type GuestInput,
  type ReservationRequestInput,
} from '@/schemas/checkout.schema';
import type { GuestInfo } from '@/types/booking.types';
import type {
  BankDetails,
  CheckoutPendingRecovery,
  CheckoutQuoteOk,
  CheckoutQuoteResponse,
  PaymentMethod,
  ReservationRoomSummary,
} from '@/types/checkout.types';

import { EASE_OUT } from '../motion/variants';
import { Button } from '../ui/button';
import {
  ConfirmingScreen,
  ExpiredPanel,
  ExpiringBanner,
  FailedPanel,
  NetworkErrorBanner,
  PendingHoldBanner,
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
const RESERVE_KEY_PREFIX = 'dela:reserve-key:';
const PAY_KEY_PREFIX = 'dela:pay-key:';
const PENDING_DISMISSED_PREFIX = 'dela:checkout-resume-dismissed:';
const rawString = (value: string) => value;
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
  /** Parsed `serverTime` of the latest status response, so the countdown can re-measure the skew. */
  serverNowMs?: number;
}
interface CheckoutFlowProps {
  room: ReservationRoomSummary & { slug: string };
  stay: { checkIn: string; checkOut: string; adults: number; children: number };
  initialQuote: CheckoutQuoteResponse;
  seenTotalMinor: number | null;
  resumeReference: string | null;
  /** The guest's own still-live hold for this stay, if the server found one. */
  pendingRecovery: CheckoutPendingRecovery | null;
  /** Details already stored on the hold, so the guest can review and edit them. */
  initialGuest: GuestInfo | null;
  hotelTimes: { checkIn: string; checkOut: string };
}
export function CheckoutFlow({
  room,
  stay,
  initialQuote,
  resumeReference,
  pendingRecovery,
  initialGuest,
  hotelTimes,
}: CheckoutFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const emptyGuest: GuestInput = {
    fullName: '',
    email: '',
    country: 'NG',
    phone: '',
    arrivalTime: '',
    specialRequests: '',
  };
  const form = useForm<GuestInput, unknown, GuestDetails>({
    resolver: zodResolver(guestSchema),
    defaultValues: (initialGuest as GuestInput | null) ?? emptyGuest,
    mode: 'onBlur',
  });
  const { clearDraft } = useFormDraft(
    form,
    `checkout:${room.slug}:${stay.checkIn}:${stay.checkOut}:${stay.adults}:${stay.children}`,
  );
  const {
    control,
    formState: { errors: formErrors },
    setError: setGuestError,
    setValue,
    trigger,
  } = form;
  const values = useWatch({ control }) as GuestInput;
  const quoteMutation = useCheckoutQuote();
  const createReservation = useCreateReservation();
  const updateHold = useUpdateHold();
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
  const [extrasPending, setExtrasPending] = useState(false);
  // A guest who has taken over a booking — from the provider or from their own live
  // hold — has already given their details and accepted the price.
  const [adopted, setAdopted] = useState(false);
  const resumed = resumeReference !== null || adopted;
  const [accepted, setAccepted] = useState(resumed);
  const ok: CheckoutQuoteOk | null = quote.status === 'ok' ? quote : null;
  const priceChange = ok?.priceChange && !accepted ? ok.priceChange : null;
  // --- form ---
  const [terms, setTerms] = useState(resumed);
  const [termsError, setTermsError] = useState<string | undefined>();
  const [website, setWebsite] = useState('');
  const [extraBed, setExtraBed] = useState(
    initialQuote.status === 'ok' ? initialQuote.extraBed.selected : false,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialQuote.status === 'ok'
        ? initialQuote.breakdown.extras.map((e) => [e.id, e.quantity])
        : [],
    ),
  );
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
  /** The amount the live provider session was opened for, if any. */
  const payableAmount = useRef(
    initialQuote.status === 'ok' ? initialQuote.payment.dueNowMinor : 0,
  );
  /**
   * Payment keys are scoped to the reservation and survive a refresh, so resuming
   * checkout replays the payment it already opened instead of starting a second one.
   */
  const payKey = useRef<{ scope: string; key: string } | null>(null);
  function payKeyScope(reference: string): string {
    return `${PAY_KEY_PREFIX}${reference}`;
  }
  function ensurePayKey(reference: string): string {
    const scope = payKeyScope(reference);
    if (payKey.current?.scope === scope) return payKey.current.key;
    const stored = getWebStorageValue<string>(
      'sessionStorage',
      scope,
      rawString,
    );
    const key = stored ?? newKey();
    if (!stored) setWebStorageValue('sessionStorage', scope, key, rawString);
    payKey.current = { scope, key };
    return key;
  }
  function clearPayKey(reference: string | null | undefined): void {
    if (reference) {
      removeWebStorageValue('sessionStorage', payKeyScope(reference));
    }
    payKey.current = null;
  }
  /**
   * The key that creates the reservation survives a refresh, so reloading checkout
   * replays the booking it already made instead of taking a second hold.
   */
  const reserveKeyScope = `${RESERVE_KEY_PREFIX}checkout:${room.slug}:${stay.checkIn}:${stay.checkOut}:${stay.adults}:${stay.children}`;
  const [reserveKey, setReserveKey, removeReserveKey] = useWebStorage<
    string | null
  >('sessionStorage', reserveKeyScope, null, (key) => key ?? '', rawString);
  /** Reads through to storage too, so a submit before hydration still reuses a key. */
  function ensureReserveKey(): string {
    if (reserveKey) return reserveKey;
    const stored = getWebStorageValue<string>(
      'sessionStorage',
      reserveKeyScope,
      rawString,
    );
    const key = stored ?? newKey();
    setReserveKey(key);
    return key;
  }
  /** Only a genuinely new booking attempt needs a new key, and it is written down at once. */
  function rotateReserveKey(): void {
    setReserveKey(newKey());
  }
  const inForm = phase.name === 'form' || phase.name === 'failed';
  // True from the first client commit, so browser-only state is never read while
  // the page is still being rendered on the server.
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated) setHydrated(true);
  const pendingReference = pendingRecovery?.reference ?? null;
  const dismissalKey = `${PENDING_DISMISSED_PREFIX}${pendingReference ?? 'none'}`;
  // Seed from storage on the first render, so a dismissed banner never flashes
  // while the hook waits for its mount effect.
  const initialDismissal = useMemo(
    () =>
      getWebStorageValue<string>('sessionStorage', dismissalKey, rawString) ??
      '',
    [dismissalKey],
  );
  const [dismissal, setDismissal] = useWebStorage<string>(
    'sessionStorage',
    dismissalKey,
    initialDismissal,
    rawString,
    rawString,
  );
  const holdActive =
    reservation !== null && reservation.holdExpiresAt > 0 && inForm;
  const hold = useHoldCountdown(
    holdActive ? reservation.holdExpiresAt : null,
    reservation?.skewMs ?? 0,
    reservation?.serverNowMs,
  );
  const expired = holdActive && hold.expired;
  // The banner counts down the hold it is offering to hand back, and disappears
  // when that hold runs out — there is nothing left to continue.
  const showPendingHold =
    hydrated &&
    pendingRecovery !== null &&
    dismissal !== '1' &&
    reservation === null;
  const pendingHold = useHoldCountdown(
    showPendingHold ? (pendingRecovery?.holdExpiresAtMs ?? null) : null,
    0,
    pendingRecovery?.serverTimeMs,
  );
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
  const quoteRequest = () => ({
    room: room.slug,
    ...stay,
    extraBed,
    extras: selections,
    seenTotalMinor: null,
  });
  // Re-quote when the extras or the extra bed change. Deliberately not keyed
  // on the quote itself, so a refreshed quote does not re-trigger it.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (quote.status !== 'ok') return;
    const timer = window.setTimeout(async () => {
      setQuoteFailed(false);
      setAccepted(true);
      try {
        setQuote(await quoteMutation.mutateAsync(quoteRequest()));
      } catch {
        setQuoteFailed(true);
      } finally {
        setExtrasPending(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only extras changes should re-quote
  }, [extraBed, quantities]);
  // polling after the guest returns from the provider
  useEffect(() => {
    if (phase.name !== 'confirming' || !reservation || timedOut) return;
    const timer = window.setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase.name, pollNonce, reservation, timedOut]);
  // Server-driven transitions when a fresh poll result arrives. Adjusting
  // state during render (guarded by the previous value) replaces setState in
  // an effect; the router calls below stay in an effect.
  const [syncedStatus, setSyncedStatus] = useState(status);
  if (status !== syncedStatus) {
    setSyncedStatus(status);
    if (status && reservation) {
      if (status.status === 'pending_approval') {
        setPhase({ name: 'request-received', reason: 'manual' });
      } else if (status.status === 'expired') {
        setReservation(null);
        setPhase({ name: 'form' });
      } else if (
        status.status === 'payment_failed' ||
        status.paymentStatus === 'failed' ||
        status.status === 'cancelled' ||
        status.paymentStatus === 'cancelled'
      ) {
        setReservation({
          reference: reservation.reference,
          holdExpiresAt: Date.parse(status.holdExpiresAt),
          skewMs: reservation.skewMs,
          serverNowMs: Date.parse(status.serverTime),
        });
        setPhase({
          name: 'failed',
          reason:
            status.status === 'cancelled' ||
            status.paymentStatus === 'cancelled'
              ? 'cancelled'
              : 'failed',
        });
      }
    }
  }
  // Navigate for the terminal statuses once the transitions above have
  // committed. This effect only talks to the router.
  useEffect(() => {
    if (!status) return;
    if (status.status === 'expired') router.replace(checkoutHref(stay));
    else if (
      status.status === 'confirmed' ||
      status.status === 'awaiting_transfer' ||
      status.status === 'awaiting_verification' ||
      status.status === 'reserved_pay_at_hotel' ||
      status.status === 'checked_in' ||
      status.status === 'checked_out' ||
      status.status === 'no_show'
    ) {
      if (reservation) {
        removeReserveKey();
        clearPayKey(reservation.reference);
        router.push(confirmationHref(reservation.reference));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router helpers and stay are stable; navigate only on status changes
  }, [status]);
  // validation
  const detailsValid = guestSchema.safeParse(values).success;
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
  // actions
  function handleFailure(err: unknown) {
    const fail = err instanceof ServiceError ? err : null;
    const body = fail?.body;
    if (!fail || fail.network || fail.status >= 500) {
      setNetError(ERROR_MESSAGES.COULD_NOT_REACH_SERVER_UNKNOWN_OUTCOME);
      return;
    }
    clearPayKey(reservation?.reference);
    if (body?.code === ERROR_CODES.PAYMENT_INIT_FAILED) {
      rotateReserveKey();
      setReservation(null);
      setBank(null);
      setAdopted(false);
      setPhase({ name: 'form' });
      setNetError(body.message ?? ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE);
      return;
    }
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
    const key = ensurePayKey(reference);
    const init = await initPayment.mutateAsync({
      reference,
      method,
      idempotencyKey: key,
    });
    if (init.kind === 'redirect') {
      setPhase({ name: 'redirecting' });
      window.location.assign(init.url);
      return;
    }
    clearPayKey(reference);
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
  async function submitResolved(guest: GuestDetails) {
    if (submitting.current || !ok || quoteLoading || priceChange || expired)
      return;
    let current = reservation;
    if (!current) {
      const termsMessage = terms ? undefined : TERMS_MESSAGE;
      setTermsError(termsMessage);
      if (termsMessage) {
        // The box is below the fold on a phone, so the message alone leaves
        // "Pay" looking like a button that does nothing.
        const box = document.getElementById('field-terms');
        box?.focus();
        box?.scrollIntoView({ block: 'center' });
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setNetError(null);
    try {
      if (!current) {
        const body: ReservationRequestInput = {
          idempotencyKey: ensureReserveKey(),
          room: room.slug,
          ...stay,
          extraBed,
          extras: selections,
          guest,
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
        payableAmount.current = res.amounts.dueNowMinor;
        setReservation(current);
        clearDraft();
      } else {
        const res = await updateHold.mutateAsync({
          reference: current.reference,
          body: {
            guest,
            extraBed,
            extras: selections,
            expectedTotalMinor: ok.breakdown.totalMinor,
            website,
          },
        });
        if (res.amounts.dueNowMinor !== payableAmount.current) {
          clearPayKey(current.reference);
          setBank(null);
          payableAmount.current = res.amounts.dueNowMinor;
        }
      }
      if (ok.payment.mode === 'pay_at_hotel') {
        removeReserveKey();
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
    void form.handleSubmit(submitResolved)();
  };
  /**
   * Take over the hold the guest already has instead of making another one. Nothing
   * is sent to the server here: the reservation, its terms and its method are all
   * already stored, so the form returns to the step the guest actually left from.
   */
  function adoptPendingHold() {
    if (!pendingRecovery) return;
    clearPayKey(pendingRecovery.reference);
    setReservation({
      reference: pendingRecovery.reference,
      holdExpiresAt: pendingRecovery.holdExpiresAtMs,
      skewMs: pendingRecovery.serverTimeMs - Date.now(),
      serverNowMs: pendingRecovery.serverTimeMs,
    });
    removeReserveKey();
    if (pendingRecovery.method) setMethod(pendingRecovery.method);
    setAccepted(true);
    setTerms(true);
    setTermsError(undefined);
    setAdopted(true);
  }
  /** Drops only this booking's pointer, in this tab, and lets a new attempt start. */
  function dismissPendingHold() {
    if (pendingReference) setDismissal('1');
    void restart();
  }
  async function restart() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      rotateReserveKey();
      clearPayKey(reservation?.reference);
      setReservation(null);
      setBank(null);
      setProofFile(null);
      setNetError(null);
      setTimedOut(false);
      setAdopted(false);
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
    clearPayKey(reservation?.reference);
    setPhase({ name: 'form' });
    window.setTimeout(() => void submit(), 0);
  };
  const switchMethod = () => {
    clearPayKey(reservation?.reference);
    setBank(null);
    setPhase({ name: 'form' });
    document.getElementById('step-payment')?.scrollIntoView({ block: 'start' });
  };
  function chooseMethod(next: PaymentMethod) {
    setMethod(next);
    if (next !== 'bank_transfer') setBank(null);
    clearPayKey(reservation?.reference);
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
        <Alert role="alert" variant="destructive" size="banner">
          <AlertTitle>{ERROR_MESSAGES.COULD_NOT_OPEN_CHECKOUT}</AlertTitle>
          <AlertDescription>
            <p>{quote.status === 'invalid' ? quote.message : ''}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  const payment = ok.payment;
  const redirecting = phase.name === 'redirecting';
  const disabledAction =
    busy ||
    redirecting ||
    quoteLoading ||
    extrasPending ||
    expired ||
    Boolean(priceChange);
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
            // Nothing is owed here, so the tick means the guest added something.
            optional: true,
            state: (selections.length > 0 || extraBed
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
  // One notice at a time. Stacked banners push the form, and the fix, off screen,
  // so the list is ordered by what blocks the guest right now.
  const noticeKey:
    'expired' | 'failed' | 'net' | 'quote' | 'pending' | 'expiring' | null =
    expired
      ? 'expired'
      : phase.name === 'failed'
        ? 'failed'
        : netError
          ? 'net'
          : quoteFailed
            ? 'quote'
            : showPendingHold && !pendingHold.expired
              ? 'pending'
              : hold.expiring && holdActive
                ? 'expiring'
                : null;
  const failedReason = phase.name === 'failed' ? phase.reason : null;
  // While a request is in flight nothing on the page may change under it: the
  // total the guest is about to pay is the total the server priced.
  const formLocked = expired || busy;
  let main: React.ReactNode;
  /** Whether the screen below already brings its own page heading. */
  let screenOwnsHeading = false;
  if (phase.name === 'confirming') {
    screenOwnsHeading = true;
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
    screenOwnsHeading = true;
    main = (
      <TransferSubmittedScreen
        reference={reservation.reference}
        confirmationHref={confirmationHref(reservation.reference)}
      />
    );
  } else if (phase.name === 'request-received' && reservation) {
    screenOwnsHeading = true;
    main = (
      <RequestReceivedScreen
        reason={phase.reason}
        reference={reservation.reference}
        confirmationHref={confirmationHref(reservation.reference)}
      />
    );
  } else if (redirecting) {
    main = (
      <Alert role="status" variant="neutral" size="banner">
        <AlertTitle>Taking you to the secure payment page</AlertTitle>
        <AlertDescription>
          <p className="flex items-center gap-2">
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            Please do not close this page.
          </p>
        </AlertDescription>
      </Alert>
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
          {noticeKey && (
            <motion.div
              key={noticeKey}
              {...bannerMotion}
              transition={bannerTransition}
            >
              {noticeKey === 'expired' && (
                <ExpiredPanel onRestart={restart} busy={busy} />
              )}
              {noticeKey === 'failed' && failedReason && (
                <FailedPanel
                  reason={failedReason}
                  holdActive={holdActive}
                  onRetry={retryPayment}
                  onSwitch={switchMethod}
                  busy={busy}
                />
              )}
              {noticeKey === 'net' && netError && (
                <NetworkErrorBanner
                  message={netError}
                  onRetry={() => void submit()}
                  busy={busy}
                />
              )}
              {noticeKey === 'quote' && (
                <Alert role="alert" variant="destructive" size="banner">
                  <AlertTitle>
                    {ERROR_MESSAGES.COULD_NOT_UPDATE_PRICE}
                  </AlertTitle>
                  <AlertDescription>
                    <p>
                      Your last change may not be included in the total. Change
                      it again to retry.
                    </p>
                  </AlertDescription>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuoteFailed(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </Alert>
              )}
              {noticeKey === 'pending' && pendingRecovery && (
                <PendingHoldBanner
                  reference={pendingRecovery.reference}
                  remainingMs={pendingHold.remainingMs}
                  onContinue={adoptPendingHold}
                  onChange={dismissPendingHold}
                />
              )}
              {noticeKey === 'expiring' && <ExpiringBanner />}
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
          {reservation && !expired && !noticeKey && (
            <Alert role="status" variant="neutral" size="panel">
              <AlertDescription>
                Your room is held. You can still update your details, extras and
                extra bed before you pay.
              </AlertDescription>
            </Alert>
          )}
          <fieldset
            disabled={formLocked}
            className="min-w-0 space-y-10 border-0 p-0"
          >
            <legend className="sr-only">Your details and extras</legend>
            <DetailsStep
              values={values}
              errors={detailsErrors}
              disabled={formLocked}
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
                disabled={formLocked}
                onQuantity={(id, q) => {
                  setQuantities((s) => ({ ...s, [id]: q }));
                  setExtrasPending(true);
                  if (reservation) setBank(null);
                }}
                extraBed={{ ...ok.extraBed, selected: extraBed }}
                onExtraBed={(value) => {
                  setExtraBed(value);
                  setExtrasPending(true);
                  if (reservation) setBank(null);
                }}
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
            disabled={formLocked}
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
      {!screenOwnsHeading && (
        <div
          className={
            inForm && !priceChange && !expired ? 'mb-8 space-y-6' : 'mb-8'
          }
        >
          <h1 className="font-display text-h2">Complete your booking</h1>
          {inForm && !priceChange && !expired && (
            <ProgressSteps steps={steps} />
          )}
        </div>
      )}
      <div className="mb-6">
        <MobileSummary {...summaryProps} />
      </div>
      <div className="booking-rail">
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
          className="sticky-under-header hidden lg:block"
        >
          <SummaryCard {...summaryProps} pinned />
        </aside>
      </div>
      {showBar && (
        <MobileActionBar>
          <ActionBarAmount
            label={payment.mode === 'pay_at_hotel' ? 'Pay at hotel' : 'Due now'}
            amount={formatMinor(
              payment.mode === 'pay_at_hotel'
                ? payment.totalMinor
                : payment.dueNowMinor,
            )}
          />
          <div className="min-w-0 flex-1">{action}</div>
        </MobileActionBar>
      )}
    </div>
  );
}

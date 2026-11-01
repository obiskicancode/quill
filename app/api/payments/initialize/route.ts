import { eq } from 'drizzle-orm';

import { config } from '@/config';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { reservationChanges, reservations } from '@/db/schema';
import { CHECKOUT_ACTIONABLE_STATUSES } from '@/lib/booking/recovery';
import { getAccess } from '@/lib/booking/session';
import {
  ensureBankTransferPayment,
  insertPayment,
  loadStoredReservation,
  saveStoredReservation,
  type QueryExecutor,
  type StoredReservation,
} from '@/lib/booking/store';
import { loadReservation } from '@/lib/booking/view';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import { createReference } from '@/lib/db/reference';
import {
  claimIdempotency,
  finishIdempotency,
  getIdempotencyRecord,
  releaseIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { clientIp } from '@/lib/http/request';
import { requireManage } from '@/lib/manage/auth';
import { logStructured } from '@/lib/observability';
import {
  tryGetPaymentProvider,
  type PaymentProviderAdapter,
} from '@/lib/payments';
import { rateLimit } from '@/lib/rate-limit';
import { fieldErrorsFrom, paymentInitSchema } from '@/schemas/checkout.schema';
import type { ApiError, PaymentInitResponse } from '@/types/checkout.types';

const fail = (status: number, error: ApiError) =>
  apiFail(status, error.message, error);

function paymentInitFailed(input: {
  reservationId: string;
  changeId?: string | null;
  message: string;
}) {
  logStructured(
    'payment.init_failed',
    {
      reservationId: input.reservationId,
      changeId: input.changeId ?? null,
      reason: input.message,
    },
    'warn',
  );
  return fail(409, {
    code: ERROR_CODES.PAYMENT_INIT_FAILED,
    message: input.message,
  });
}

function appUrl(path: string): string {
  return `${config.SITE.URL.replace(/\/$/, '')}${path}`;
}

/** The step that runs inside the transaction, once the reservation is locked. */
type InitStep =
  | { response: PaymentInitResponse }
  | { reject: { status: number; error: ApiError } };

type InitOutcome =
  | { kind: 'ok'; response: PaymentInitResponse }
  | { kind: 'replay'; response: PaymentInitResponse }
  | { kind: 'in_progress' }
  | { kind: 'rejected'; status: number; error: ApiError };

type Plan =
  | { kind: 'bank_transfer' }
  | {
      kind: 'online';
      providerId: PaymentProviderAdapter['id'];
      url: string;
      providerReference: string;
      amountMinor: number;
    };

function rejectInit(status: number, message: string): InitStep {
  return {
    reject: { status, error: { code: ERROR_CODES.VALIDATION, message } },
  };
}

/**
 * Commits an initialize step in one transaction: the claim, the payment row, the
 * stamped reservation and the reply that replays them either all exist or none do, so
 * a request that dies partway can never leave a hold the guest cannot pay or a reply
 * that points at nothing.
 *
 * The reservation is locked and re-read before any of it runs, so a webhook or the
 * expiry cron that moved the row while this request was in flight is seen here instead
 * of overwritten by the copy the route read earlier.
 */
async function commitInit(input: {
  idKey: string;
  reference: string;
  reservationId: string;
  apply: (ctx: {
    r: StoredReservation;
    tx: QueryExecutor;
  }) => Promise<InitStep>;
}): Promise<InitOutcome> {
  return db.transaction(async (tx): Promise<InitOutcome> => {
    const claim = await claimIdempotency(
      input.idKey,
      120,
      { method: 'POST', path: '/api/payments/initialize' },
      tx,
    );
    if (!claim.claimed) {
      if (claim.record?.response)
        return {
          kind: 'replay',
          response: claim.record.response as PaymentInitResponse,
        };
      return { kind: 'in_progress' };
    }

    await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for('update');

    const fresh = await loadStoredReservation(input.reference, tx);
    if (!fresh) {
      await releaseIdempotency(input.idKey, tx);
      return {
        kind: 'rejected',
        status: 404,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.RESERVATION_NOT_FOUND,
        },
      };
    }

    const step = await input.apply({ r: fresh, tx });
    if ('reject' in step) {
      await releaseIdempotency(input.idKey, tx);
      return { kind: 'rejected', ...step.reject };
    }

    await finishIdempotency(
      input.idKey,
      step.response,
      200,
      60,
      { reservationId: input.reservationId },
      tx,
    );
    return { kind: 'ok', response: step.response };
  });
}

function initResponse(outcome: InitOutcome) {
  if (outcome.kind === 'ok' || outcome.kind === 'replay')
    return apiOk(outcome.response);
  if (outcome.kind === 'in_progress')
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.REQUEST_IN_PROGRESS,
    });
  return fail(outcome.status, outcome.error);
}

/**
 * Opens the hosted session for an online attempt before anything is written, because
 * no transaction may span the provider call. Every attempt gets a fresh provider
 * reference: the provider rejects a reference it has already seen, and an old session
 * must never be forced onto a new attempt. Replaying a completed attempt is handled by
 * the idempotency record instead.
 */
async function openProviderSession(input: {
  provider: PaymentProviderAdapter;
  reference: string;
  email: string;
  amountMinor: number;
  callbackUrl: string;
  changeId?: string | null;
}): Promise<{
  url: string;
  providerReference: string;
}> {
  const providerReference = createReference();
  const { redirectUrl } = await input.provider.initialize({
    email: input.email,
    amountMinor: input.amountMinor,
    reference: providerReference,
    callbackUrl: input.callbackUrl,
    metadata: {
      reservationReference: input.reference,
      ...(input.changeId ? { changeId: input.changeId } : {}),
    },
  });
  return { url: redirectUrl, providerReference };
}

/**
 * Starts a payment: returns the hotel's bank details, or a hosted redirect from the configured online provider.
 * Each attempt opens a new provider session, and every write the attempt needs — payment row, reservation,
 * replayable reply — lands in a single commit.
 */
export async function POST(req: Request) {
  const client = clientIp(req) ?? 'local';
  if (!(await rateLimit(`pay-init:${client}`, 20, 60_000)).allowed) {
    return fail(429, {
      code: ERROR_CODES.RATE_LIMITED,
      message: ERROR_MESSAGES.RATE_LIMITED,
    });
  }

  const parsed = paymentInitSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(422, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.INVALID_PAYMENT_REQUEST,
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  const { reference, method, idempotencyKey, purpose, changeId } = parsed.data;

  const idKey = `pay:${reference}:${purpose ?? 'booking'}:${changeId ?? 'none'}:${idempotencyKey}`;
  const previous = await getIdempotencyRecord(idKey);
  if (previous?.response)
    return apiOk(previous.response as PaymentInitResponse);

  const settings = await getCheckoutSettings();
  const r = await loadReservation(reference);
  if (!r)
    return fail(404, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.RESERVATION_NOT_FOUND,
    });
  if (r.status === 'expired')
    return fail(410, {
      code: ERROR_CODES.HOLD_EXPIRED,
      message: ERROR_MESSAGES.HOLD_EXPIRED,
    });
  if (r.status === 'cancelled')
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.RESERVATION_CANCELLED,
    });

  if (purpose !== 'change') {
    const access = await getAccess(reference);
    if (!access)
      return fail(401, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.SESSION_EXPIRED,
      });
  } else {
    const auth = await requireManage(req, reference);
    if (!auth.ok) return auth.res;
  }

  // These reads answer the common cases before any work starts. The transaction
  // repeats them against the locked row, and that is the one that decides.
  const pending = purpose === 'change' ? r.pendingChange : null;
  if (purpose === 'change') {
    if (!pending || pending.changeId !== changeId)
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.NO_PENDING_DATE_CHANGE,
      });
    if (pending.status === 'awaiting_verification')
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.CHANGE_AWAITING_VERIFICATION,
      });
  } else {
    if (r.mode === 'pay_at_hotel')
      return fail(400, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.NOTHING_TO_PAY_ONLINE,
      });
    if (!CHECKOUT_ACTIONABLE_STATUSES.includes(r.status))
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.RESERVATION_ALREADY_PROCESSING,
      });
  }

  let plan: Plan;
  if (method === 'bank_transfer') {
    plan = { kind: 'bank_transfer' };
  } else {
    const provider = tryGetPaymentProvider();
    if (!provider?.isConfigured())
      return paymentInitFailed({
        reservationId: r.id,
        changeId: pending?.changeId,
        message: ERROR_MESSAGES.ONLINE_PAYMENTS_UNAVAILABLE,
      });
    if (!r.guest.email)
      return paymentInitFailed({
        reservationId: r.id,
        changeId: pending?.changeId,
        message: ERROR_MESSAGES.EMAIL_REQUIRED_FOR_ONLINE_PAYMENT,
      });

    const amountMinor = pending ? pending.amountDueMinor : r.totals.dueNowMinor;
    try {
      const session = await openProviderSession({
        provider,
        reference,
        email: r.guest.email,
        amountMinor,
        callbackUrl: appUrl(
          purpose === 'change'
            ? `/booking/manage?ref=${encodeURIComponent(reference)}&return=change`
            : `/booking/confirmation?ref=${encodeURIComponent(reference)}&return=1`,
        ),
        changeId: pending?.changeId,
      });
      plan = {
        kind: 'online',
        providerId: provider.id,
        amountMinor,
        ...session,
      };
    } catch {
      return paymentInitFailed({
        reservationId: r.id,
        changeId: pending?.changeId,
        message: ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE,
      });
    }
  }

  const outcome = await commitInit({
    idKey,
    reference,
    reservationId: r.id,
    apply: async ({ r: fresh, tx }) => {
      if (fresh.status === 'expired')
        return {
          reject: {
            status: 410,
            error: {
              code: ERROR_CODES.HOLD_EXPIRED,
              message: ERROR_MESSAGES.HOLD_EXPIRED,
            },
          },
        };
      if (fresh.status === 'cancelled')
        return rejectInit(409, ERROR_MESSAGES.RESERVATION_CANCELLED);

      const change = purpose === 'change' ? fresh.pendingChange : null;
      if (purpose === 'change') {
        if (!change || change.changeId !== changeId)
          return rejectInit(409, ERROR_MESSAGES.NO_PENDING_DATE_CHANGE);
        if (change.status === 'awaiting_verification')
          return rejectInit(409, ERROR_MESSAGES.CHANGE_AWAITING_VERIFICATION);
      } else {
        if (fresh.mode === 'pay_at_hotel')
          return rejectInit(400, ERROR_MESSAGES.NOTHING_TO_PAY_ONLINE);
        if (!CHECKOUT_ACTIONABLE_STATUSES.includes(fresh.status))
          return rejectInit(409, ERROR_MESSAGES.RESERVATION_ALREADY_PROCESSING);
      }

      if (plan.kind === 'bank_transfer') {
        if (change) {
          change.method = 'bank_transfer';
          change.status = 'awaiting_transfer';
        } else {
          fresh.status = 'awaiting_transfer';
          await ensureBankTransferPayment(
            { reservationId: fresh.id, amountMinor: fresh.totals.dueNowMinor },
            tx,
          );
        }
        await saveStoredReservation(fresh, tx);
        return {
          response: {
            kind: 'bank_transfer',
            bank: settings.bank,
            amountMinor: change
              ? change.amountDueMinor
              : fresh.totals.dueNowMinor,
            reference,
          },
        };
      }

      // The row has to describe the session the guest was just sent to, so it keeps
      // the amount and reference that call used instead of a re-read of them. It is
      // always a new row: reusing an old provider reference is what the provider rejects.
      const paymentId = await insertPayment(
        {
          reservationId: fresh.id,
          reference: plan.providerReference,
          method: 'online',
          amountMinor: plan.amountMinor,
          provider: plan.providerId,
          providerReference: plan.providerReference,
          note: change?.changeId ?? null,
        },
        tx,
      );
      if (change) {
        change.method = 'online';
        change.status = 'awaiting_payment';
        await tx
          .update(reservationChanges)
          .set({ paymentId, updatedAt: new Date() })
          .where(eq(reservationChanges.id, change.changeId));
        await saveStoredReservation(fresh, tx);
      }
      return { response: { kind: 'redirect', url: plan.url } };
    },
  });

  return initResponse(outcome);
}

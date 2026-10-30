import { eq } from 'drizzle-orm';

import { config } from '@/config';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { db } from '@/db';
import { reservationChanges } from '@/db/schema';
import { getAccess } from '@/lib/booking/session';
import {
  findReusableOnlinePayment,
  insertPayment,
  saveStoredReservation,
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
import {
  tryGetPaymentProvider,
  type PaymentProviderAdapter,
} from '@/lib/payments';
import { rateLimit } from '@/lib/rate-limit';
import { fieldErrorsFrom, paymentInitSchema } from '@/schemas/checkout.schema';
import type { ApiError, PaymentInitResponse } from '@/types/checkout.types';

const fail = (status: number, error: ApiError) =>
  apiFail(status, error.message, error);

const unavailable = () =>
  fail(503, {
    code: ERROR_CODES.UNAVAILABLE,
    message: ERROR_MESSAGES.ONLINE_PAYMENTS_UNAVAILABLE,
  });

function appUrl(path: string): string {
  return `${config.SITE.URL.replace(/\/$/, '')}${path}`;
}

async function redirectToProvider(input: {
  provider: PaymentProviderAdapter;
  reference: string;
  email: string;
  amountMinor: number;
  callbackUrl: string;
  reservationId: string;
  changeId?: string;
}): Promise<string> {
  const reusable = await findReusableOnlinePayment({
    reservationId: input.reservationId,
    provider: input.provider.id,
    amountMinor: input.amountMinor,
    changeId: input.changeId ?? null,
  });
  const providerReference =
    reusable?.providerRef ?? reusable?.reference ?? createReference();
  const paymentId = reusable
    ? reusable.id
    : await insertPayment({
        reservationId: input.reservationId,
        reference: providerReference,
        method: 'online',
        amountMinor: input.amountMinor,
        provider: input.provider.id,
        providerReference,
        note: input.changeId ?? null,
      });
  if (input.changeId)
    await db
      .update(reservationChanges)
      .set({ paymentId, updatedAt: new Date() })
      .where(eq(reservationChanges.id, input.changeId));
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
  return redirectUrl;
}

/**
 * Starts a payment: returns the hotel's bank details, or a hosted redirect from the configured online provider.
 * The payment row is persisted first, so a retry reuses the same provider reference.
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
        code: ERROR_CODES.UNAUTHORISED,
        message: ERROR_MESSAGES.SESSION_EXPIRED,
      });
  }

  if (purpose === 'change') {
    const auth = await requireManage(req, reference);
    if (!auth.ok) return auth.res;
    const pc = r.pendingChange;
    if (!pc || pc.changeId !== changeId)
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.NO_PENDING_DATE_CHANGE,
      });
    if (pc.status === 'awaiting_verification')
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.CHANGE_AWAITING_VERIFICATION,
      });

    const claim = await claimIdempotency(idKey, 120, {
      method: 'POST',
      path: '/api/payments/initialize',
    });
    if (!claim.claimed) {
      if (claim.record?.response)
        return apiOk(claim.record.response as PaymentInitResponse);
      return fail(409, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.REQUEST_IN_PROGRESS,
      });
    }

    pc.method = method;
    let response: PaymentInitResponse;
    if (method === 'bank_transfer') {
      pc.status = 'awaiting_transfer';
      response = {
        kind: 'bank_transfer',
        bank: settings.bank,
        amountMinor: pc.amountDueMinor,
        reference,
      };
      r.method = 'bank_transfer';
      await saveStoredReservation(r);
    } else {
      const provider = tryGetPaymentProvider();
      if (!provider?.isConfigured()) {
        await releaseIdempotency(idKey);
        return unavailable();
      }
      if (!r.guest.email) {
        await releaseIdempotency(idKey);
        return fail(422, {
          code: ERROR_CODES.VALIDATION,
          message: ERROR_MESSAGES.EMAIL_REQUIRED_FOR_ONLINE_PAYMENT,
          fieldErrors: { 'guest.email': ERROR_MESSAGES.EMAIL_REQUIRED },
        });
      }
      pc.status = 'awaiting_payment';
      await saveStoredReservation(r);
      try {
        const url = await redirectToProvider({
          provider,
          reference,
          email: r.guest.email,
          amountMinor: pc.amountDueMinor,
          callbackUrl: appUrl(
            `/booking/manage?ref=${encodeURIComponent(reference)}&return=change`,
          ),
          reservationId: r.id,
          changeId: pc.changeId,
        });
        response = { kind: 'redirect', url };
      } catch {
        await releaseIdempotency(idKey);
        return fail(502, {
          code: ERROR_CODES.SERVER,
          message: ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE,
        });
      }
    }
    await finishIdempotency(idKey, response, 200, 60, {
      reservationId: r.id,
    });
    return apiOk(response);
  }

  if (r.mode === 'pay_at_hotel')
    return fail(400, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.NOTHING_TO_PAY_ONLINE,
    });
  if (
    !['pending_payment', 'awaiting_transfer', 'payment_failed'].includes(
      r.status,
    )
  )
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.RESERVATION_ALREADY_PROCESSING,
    });

  const claim = await claimIdempotency(idKey, 120, {
    method: 'POST',
    path: '/api/payments/initialize',
  });
  if (!claim.claimed) {
    if (claim.record?.response)
      return apiOk(claim.record.response as PaymentInitResponse);
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.REQUEST_IN_PROGRESS,
    });
  }

  r.method = method;
  let response: PaymentInitResponse;
  if (method === 'bank_transfer') {
    r.status = 'awaiting_transfer';
    await insertPayment({
      reservationId: r.id,
      reference: createReference(),
      method,
      amountMinor: r.totals.dueNowMinor,
      provider: 'bank_transfer',
    });
    response = {
      kind: 'bank_transfer',
      bank: settings.bank,
      amountMinor: r.totals.dueNowMinor,
      reference,
    };
    await saveStoredReservation(r);
  } else {
    const provider = tryGetPaymentProvider();
    if (!provider?.isConfigured()) {
      await releaseIdempotency(idKey);
      return unavailable();
    }
    if (!r.guest.email) {
      await releaseIdempotency(idKey);
      return fail(422, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.EMAIL_REQUIRED_FOR_ONLINE_PAYMENT,
        fieldErrors: { 'guest.email': ERROR_MESSAGES.EMAIL_REQUIRED },
      });
    }
    try {
      const url = await redirectToProvider({
        provider,
        reference,
        email: r.guest.email,
        amountMinor: r.totals.dueNowMinor,
        callbackUrl: appUrl(
          `/booking/confirmation?ref=${encodeURIComponent(reference)}&return=1`,
        ),
        reservationId: r.id,
      });
      response = { kind: 'redirect', url };
    } catch {
      await releaseIdempotency(idKey);
      return fail(502, {
        code: ERROR_CODES.SERVER,
        message: ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE,
      });
    }
  }
  await finishIdempotency(idKey, response, 200, 60, {
    reservationId: r.id,
  });
  return apiOk(response);
}

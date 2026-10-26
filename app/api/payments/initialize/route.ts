import { config } from '@/config';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { insertPayment, saveStoredReservation } from '@/lib/booking/store';
import { loadReservation } from '@/lib/booking/view';
import { getCheckoutSettings } from '@/lib/checkout/settings';
import { createReference } from '@/lib/db/reference';
import {
  getIdempotencyRecord,
  setIdempotency,
} from '@/lib/db/repositories/idempotency.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { requireManage } from '@/lib/manage/auth';
import {
  tryGetPaymentProvider,
  type PaymentProviderAdapter,
} from '@/lib/payments';
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
  const providerReference = createReference();
  await insertPayment({
    reservationId: input.reservationId,
    reference: providerReference,
    method: 'online',
    amountMinor: input.amountMinor,
    provider: input.provider.id,
    providerReference,
    note: input.changeId ?? null,
  });
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

  const idKey = `pay:${idempotencyKey}`;
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
      if (!provider?.isConfigured()) return unavailable();
      if (!r.guest.email)
        return fail(422, {
          code: ERROR_CODES.VALIDATION,
          message: ERROR_MESSAGES.EMAIL_REQUIRED_FOR_ONLINE_PAYMENT,
          fieldErrors: { 'guest.email': ERROR_MESSAGES.EMAIL_REQUIRED },
        });
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
        return fail(502, {
          code: ERROR_CODES.SERVER,
          message: ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE,
        });
      }
    }
    await setIdempotency(idKey, response, 200, 60, {
      reservationId: r.id,
      method: 'POST',
      path: '/api/payments/initialize',
    });
    return apiOk(response);
  }

  if (r.mode === 'pay_at_hotel')
    return fail(400, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.NOTHING_TO_PAY_ONLINE,
    });
  if (
    ![
      'pending_payment',
      'awaiting_transfer',
      'payment_failed',
      'cancelled',
    ].includes(r.status)
  )
    return fail(409, {
      code: ERROR_CODES.VALIDATION,
      message: ERROR_MESSAGES.RESERVATION_ALREADY_PROCESSING,
    });

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
    if (!provider?.isConfigured()) return unavailable();
    if (!r.guest.email)
      return fail(422, {
        code: ERROR_CODES.VALIDATION,
        message: ERROR_MESSAGES.EMAIL_REQUIRED_FOR_ONLINE_PAYMENT,
        fieldErrors: { 'guest.email': ERROR_MESSAGES.EMAIL_REQUIRED },
      });
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
      return fail(502, {
        code: ERROR_CODES.SERVER,
        message: ERROR_MESSAGES.PAYMENT_PROVIDER_UNREACHABLE,
      });
    }
  }
  await setIdempotency(idKey, response, 200, 60, {
    reservationId: r.id,
    method: 'POST',
    path: '/api/payments/initialize',
  });
  return apiOk(response);
}

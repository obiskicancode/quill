import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { completeOnlinePayment } from '@/lib/booking/store';
import {
  createWebhookEvent,
  findWebhookEvent,
  markWebhookProcessed,
} from '@/lib/db/repositories/payment-webhooks.repo';
import { apiFail, apiOk } from '@/lib/http/envelope';
import type { PaymentProvider } from '@/types/checkout.types';

import { tryGetPaymentProvider } from './factory';

/** Shared webhook pipeline. Provider adapters own signature verification and event parsing. */
export async function handlePaymentWebhook(
  providerId: PaymentProvider,
  req: Request,
): Promise<Response> {
  const provider = tryGetPaymentProvider(providerId);
  if (!provider?.isConfigured())
    return apiFail(503, ERROR_MESSAGES.PAYMENTS_NOT_CONFIGURED, {
      code: ERROR_CODES.UNAVAILABLE,
      message: ERROR_MESSAGES.PAYMENTS_NOT_CONFIGURED,
    });

  const raw = await req.text();
  const verification = await provider.verifyWebhook({
    rawBody: raw,
    headers: req.headers,
  });
  if (!verification.ok)
    return verification.reason === ERROR_CODES.WEBHOOK_INVALID_SIGNATURE
      ? apiFail(401, ERROR_MESSAGES.INVALID_SIGNATURE, {
          code: ERROR_CODES.UNAUTHORISED,
          message: ERROR_MESSAGES.INVALID_SIGNATURE,
        })
      : apiFail(422, ERROR_MESSAGES.INVALID_EVENT, {
          code: ERROR_CODES.VALIDATION,
          message: ERROR_MESSAGES.INVALID_EVENT,
        });

  const event = verification.event;
  const existing = await findWebhookEvent(provider.id, event.eventId);
  if (existing?.processed) return apiOk({ received: true });

  const stored =
    existing ??
    (await createWebhookEvent({
      provider: provider.id,
      eventId: event.eventId,
      eventType: event.type,
      payload: event.payload,
      headers: event.headers,
    }));

  try {
    if (event.status === 'paid') {
      const result = await completeOnlinePayment({
        provider: provider.id,
        reference: event.reference,
        amountMinor: event.amountMinor,
        payload: event.payload,
      });
      if (!result.ok)
        throw new Error(ERROR_MESSAGES.PAYMENT_NOT_APPLIED(event.reference));
    }
    await markWebhookProcessed(stored.id);
    return apiOk({ received: true });
  } catch (error) {
    await markWebhookProcessed(
      stored.id,
      error instanceof Error ? error.message : ERROR_MESSAGES.WEBHOOK_FAILED,
    );
    return apiFail(500, ERROR_MESSAGES.WEBHOOK_PROCESSING_FAILED, {
      code: ERROR_CODES.SERVER,
      message: ERROR_MESSAGES.WEBHOOK_PROCESSING_FAILED,
    });
  }
}

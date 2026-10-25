import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '@/config';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';

import type {
  InitializedPayment,
  PaymentInitialization,
  PaymentProviderAdapter,
  PaymentRefundInput,
  PaymentWebhookInput,
  WebhookVerification,
} from '../provider';

const BASE_URL = config.PAYMENT.BASE_URL;

function signatureMatches(rawBody: string, signature: string): boolean {
  const key = config.PAYMENT.SECRET_KEY;
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createPaystackProvider(): PaymentProviderAdapter {
  return {
    id: 'paystack',
    label: 'Paystack',

    isConfigured: () => Boolean(config.PAYMENT.SECRET_KEY),

    async initialize(
      input: PaymentInitialization,
    ): Promise<InitializedPayment> {
      const key = config.PAYMENT.SECRET_KEY;
      if (!key) throw new Error(ERROR_MESSAGES.PAYSTACK_NOT_CONFIGURED);
      const res = await fetch(`${BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: input.email,
          amount: input.amountMinor,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string };
      } | null;
      if (!res.ok || !body?.status || !body.data?.authorization_url)
        throw new Error(
          body?.message ?? ERROR_MESSAGES.PAYMENT_PROVIDER_REJECTED,
        );
      return { redirectUrl: body.data.authorization_url };
    },

    async verifyWebhook(
      input: PaymentWebhookInput,
    ): Promise<WebhookVerification> {
      if (
        !signatureMatches(
          input.rawBody,
          input.headers.get('x-paystack-signature') ?? '',
        )
      )
        return { ok: false, reason: ERROR_CODES.WEBHOOK_INVALID_SIGNATURE };

      let payload: {
        event?: string;
        data?: {
          id?: number | string;
          reference?: string;
          status?: string;
          amount?: number;
        };
      };
      try {
        payload = JSON.parse(input.rawBody);
      } catch {
        return { ok: false, reason: ERROR_CODES.WEBHOOK_INVALID_PAYLOAD };
      }
      const data = payload.data;
      if (!payload.event || !data?.reference)
        return { ok: false, reason: ERROR_CODES.WEBHOOK_INVALID_PAYLOAD };

      const status =
        payload.event === 'charge.success' && data.status === 'success'
          ? 'paid'
          : payload.event === 'charge.failed'
            ? 'failed'
            : 'ignored';
      return {
        ok: true,
        event: {
          eventId: String(data.id ?? `${payload.event}:${data.reference}`),
          type: payload.event,
          status,
          reference: data.reference,
          amountMinor: Number(data.amount ?? 0),
          payload: payload as Record<string, unknown>,
          headers: {
            signature: input.headers.get('x-paystack-signature') ?? '',
          },
        },
      };
    },

    async refund(input: PaymentRefundInput): Promise<boolean> {
      const key = config.PAYMENT.SECRET_KEY;
      if (!key || !input.reference) return false;
      try {
        const res = await fetch(`${BASE_URL}/transaction/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction: input.reference,
            amount: input.amountMinor,
          }),
        });
        const body = (await res.json().catch(() => null)) as {
          status?: boolean;
        } | null;
        return Boolean(res.ok && body?.status);
      } catch {
        return false;
      }
    },
  };
}

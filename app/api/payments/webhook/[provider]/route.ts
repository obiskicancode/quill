import { apiFail } from '@/app/api/envelope';
import { ERROR_CODES } from '@/constants/error-codes';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { isPaymentProviderId } from '@/lib/payments/provider';
import { handlePaymentWebhook } from '@/lib/payments/webhook';

/** Provider-specific endpoint, for configuring a distinct webhook URL per adapter. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  const id = provider.toLowerCase();
  if (!isPaymentProviderId(id))
    return apiFail(404, ERROR_MESSAGES.UNKNOWN_PAYMENT_PROVIDER, {
      code: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.UNKNOWN_PAYMENT_PROVIDER,
    });
  return handlePaymentWebhook(id, req);
}

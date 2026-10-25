import { getActivePaymentProviderId } from '@/lib/payments';
import { handlePaymentWebhook } from '@/lib/payments/webhook';

/** Default endpoint, using the provider selected by PAYMENT_PROVIDER. */
export async function POST(req: Request) {
  return handlePaymentWebhook(getActivePaymentProviderId(), req);
}

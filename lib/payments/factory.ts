import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { PaymentProvider } from '@/types/checkout.types';

import {
  isPaymentProviderId,
  type PaymentProviderAdapter,
  type PaymentProviderFactory,
} from './provider';
import { createPaystackProvider } from './providers/paystack';

const registry = new Map<PaymentProvider, PaymentProviderFactory>();
const builtins: Partial<Record<PaymentProvider, PaymentProviderFactory>> = {
  paystack: createPaystackProvider,
};

/** Add a provider at runtime (or from a module imported at startup). */
export function registerPaymentProvider(
  id: PaymentProvider,
  factory: PaymentProviderFactory,
): void {
  registry.set(id, factory);
}

export function getActivePaymentProviderId(): PaymentProvider {
  const configured = (process.env.PAYMENT_PROVIDER ?? 'paystack').toLowerCase();
  if (!isPaymentProviderId(configured))
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_PAYMENT_PROVIDER(configured));
  return configured;
}

export function createPaymentProvider(
  id: PaymentProvider = getActivePaymentProviderId(),
): PaymentProviderAdapter {
  const factory = registry.get(id) ?? builtins[id];
  if (!factory)
    throw new Error(ERROR_MESSAGES.PAYMENT_PROVIDER_ADAPTER_MISSING(id));
  return factory();
}

export const getPaymentProvider = createPaymentProvider;

export function tryGetPaymentProvider(
  id: PaymentProvider = getActivePaymentProviderId(),
): PaymentProviderAdapter | null {
  try {
    return createPaymentProvider(id);
  } catch {
    return null;
  }
}

export function isPaymentProviderAvailable(
  id: PaymentProvider = getActivePaymentProviderId(),
): boolean {
  try {
    return createPaymentProvider(id).isConfigured();
  } catch {
    return false;
  }
}

export function paymentProviderLabel(id: PaymentProvider): string {
  try {
    return createPaymentProvider(id).label;
  } catch {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
}

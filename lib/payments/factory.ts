/**
 * Payment provider registry and selection. Resolves the configured provider
 * from built-in adapters or ones registered at runtime, and offers safe lookups
 * for optional call sites that prefer null/false over a thrown error.
 */
import { config } from '@/config';
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

/** Resolves the configured provider id, defaulting to Paystack when unset. */
export function getActivePaymentProviderId(): PaymentProvider {
  const configured = (config.PAYMENT.PROVIDER ?? 'paystack').toLowerCase();
  if (!isPaymentProviderId(configured))
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_PAYMENT_PROVIDER(configured));
  return configured;
}

/** Instantiates a provider adapter; throws if the id is unknown or unregistered. */
export function createPaymentProvider(
  id: PaymentProvider = getActivePaymentProviderId(),
): PaymentProviderAdapter {
  const factory = registry.get(id) ?? builtins[id];
  if (!factory)
    throw new Error(ERROR_MESSAGES.PAYMENT_PROVIDER_ADAPTER_MISSING(id));
  return factory();
}

/** Returns an adapter, or null when creation fails. */
export function tryGetPaymentProvider(
  id: PaymentProvider = getActivePaymentProviderId(),
): PaymentProviderAdapter | null {
  try {
    return createPaymentProvider(id);
  } catch {
    return null;
  }
}

/** True only when the provider can be created and has its credentials configured. */
export function isPaymentProviderAvailable(
  id: PaymentProvider = getActivePaymentProviderId(),
): boolean {
  try {
    return createPaymentProvider(id).isConfigured();
  } catch {
    return false;
  }
}

/** Human-readable provider label, falling back to the capitalized id. */
export function paymentProviderLabel(id: PaymentProvider): string {
  try {
    return createPaymentProvider(id).label;
  } catch {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
}

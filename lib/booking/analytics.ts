import { getWebStorage } from '@/hooks/use-web-storage';

/**
 * Fires the purchase event once per booking, even across reloads (guarded in sessionStorage).
 * It sends no personal data: only an opaque transaction id, the amount and the currency.
 */
interface DataLayerWindow {
  dataLayer?: Record<string, unknown>[];
}

export function trackBookingConfirmedOnce(
  reference: string,
  valueMinor: number,
): void {
  const storage = getWebStorage('sessionStorage');
  if (!storage) return;

  const key = `quill_tracked_${reference}`;
  try {
    if (storage.getItem(key)) return;
    storage.setItem(key, '1');
  } catch {
    return; // storage blocked: skip rather than risk a duplicate event
  }
  const w = window as unknown as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({
    event: 'purchase',
    transaction_id: reference,
    value: Math.round(valueMinor / 100),
    currency: 'NGN',
  });
  w.dataLayer.push({ event: 'booking_confirmed' });
}

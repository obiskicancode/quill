/**
 * Guest-side booking analytics. Events are pushed to `dataLayer` only; no
 * personal data leaves the browser.
 */
import { getWebStorage } from '@/hooks/use-web-storage';

/** Minimal shape of the global analytics data layer. */
interface DataLayerWindow {
  dataLayer?: Record<string, unknown>[];
}

/**
 * Fires the purchase event once per booking, even across reloads (guarded in
 * sessionStorage). It sends only an opaque transaction id, the amount and the
 * currency.
 */
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

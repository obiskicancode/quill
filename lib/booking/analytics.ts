/**
 * Fires the purchase event once per booking, even across reloads (guarded in sessionStorage).
 * It sends no personal data: only an opaque transaction id, the amount and the currency.
 */
interface DataLayerWindow {
  dataLayer?: Record<string, unknown>[]
}

export function trackBookingConfirmedOnce(reference: string, valueMinor: number): void {
  if (typeof window === 'undefined') return
  const key = `dea_tracked_${reference}`
  try {
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, '1')
  } catch {
    return // storage blocked: skip rather than risk a duplicate event
  }
  const w = window as unknown as DataLayerWindow
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event: 'purchase', transaction_id: reference, value: Math.round(valueMinor / 100), currency: 'NGN' })
  w.dataLayer.push({ event: 'booking_confirmed' })
}

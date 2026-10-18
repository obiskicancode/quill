import type {
  ApiError, CheckoutQuoteResponse, PaymentInitRequest, PaymentInitResponse, QuoteRequest, ReservationResponse, StatusResponse,
} from '@/types/checkout.types'
import type { ReservationRequestInput } from '@/schemas/checkout.schema'

/** Typed fetch helpers. A network failure is reported as `network: true` so the UI can offer a safe retry. */
export class ApiFailure extends Error {
  constructor(public status: number, public body: ApiError | null, public network = false) {
    super(body?.message ?? (network ? 'Network error' : 'Request failed'))
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', ...init })
  } catch {
    throw new ApiFailure(0, null, true)
  }
  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok) throw new ApiFailure(res.status, (json as ApiError | null) ?? null)
  return json as T
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  quote: (body: QuoteRequest) => post<CheckoutQuoteResponse>('/api/quote', body),
  createReservation: (body: ReservationRequestInput) => post<ReservationResponse>('/api/reservations', body),
  initPayment: (body: PaymentInitRequest) => post<PaymentInitResponse>('/api/payments/initialize', body),
  status: (reference: string) => request<StatusResponse>(`/api/reservations/${encodeURIComponent(reference)}/status`, { method: 'GET' }),
  uploadProof: (reference: string, file: File) => {
    const form = new FormData()
    form.set('file', file)
    return request<StatusResponse>(`/api/reservations/${encodeURIComponent(reference)}/transfer-proof`, { method: 'POST', body: form })
  },
}

export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k${Date.now()}${Math.random().toString(36).slice(2)}`

const PROVIDER_SCRIPTS = {
  paystack: 'https://js.paystack.co/v2/inline.js',
  flutterwave: 'https://checkout.flutterwave.com/v3.js',
  stripe: 'https://js.stripe.com/v3/',
} as const

/**
 * Loads the provider's script only when the guest picks Card or USSD, and only if you opted into popup checkout
 * (NEXT_PUBLIC_PAYMENT_POPUP=1). The default hosted-redirect flow needs no script at all.
 */
export function loadProviderScript(provider: keyof typeof PROVIDER_SCRIPTS): void {
  if (process.env.NEXT_PUBLIC_PAYMENT_POPUP !== '1') return
  const src = PROVIDER_SCRIPTS[provider]
  if (document.querySelector(`script[src="${src}"]`)) return
  const s = document.createElement('script')
  s.src = src
  s.async = true
  document.head.appendChild(s)
}

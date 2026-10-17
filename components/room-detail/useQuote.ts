'use client'

import { useEffect, useState } from 'react'
import type { QuoteDemo, QuoteResponse, StayInput } from '@/lib/stay-types'

export type QuoteState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ready'; data: QuoteResponse }
  | { status: 'error' }

/** Asks the server for the price breakdown whenever the stay changes. Never calculates prices itself. */
export function useQuote(slug: string, stay: StayInput | null, demo: QuoteDemo | null) {
  const [state, setState] = useState<QuoteState>({ status: 'idle' })
  const [attempt, setAttempt] = useState(0)
  const key = stay?.checkIn && stay.checkOut ? `${stay.checkIn}|${stay.checkOut}|${stay.adults}|${stay.children}|${stay.extraBed}|${demo}|${attempt}` : 'none'

  useEffect(() => {
    if (!stay?.checkIn || !stay.checkOut) {
      setState({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    setState({ status: 'checking' })
    const p = new URLSearchParams({
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: String(stay.adults),
      children: String(stay.children),
      extraBed: stay.extraBed ? '1' : '0',
    })
    if (demo) p.set('demo', demo)
    fetch(`/api/rooms/${encodeURIComponent(slug)}/quote?${p.toString()}`, { signal: controller.signal, cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<QuoteResponse>
      })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setState({ status: 'error' })
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, slug])

  return { state, retry: () => setAttempt((a) => a + 1) }
}

'use client'

import { useEffect, useState } from 'react'
import { stayService } from '@/app/api/services/stay.service'
import type { QuoteDemo, QuoteResponse, StayInput } from '@/types/stay.types'

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
    let cancelled = false
    setState({ status: 'checking' })
    stayService
      .quote(slug, {
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: stay.adults,
        children: stay.children,
        extraBed: stay.extraBed,
        demo,
      })
      .then((res) => {
        if (!cancelled) setState({ status: 'ready', data: res.data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, slug])

  return { state, retry: () => setAttempt((a) => a + 1) }
}

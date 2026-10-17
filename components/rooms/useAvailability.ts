'use client'

import { useEffect, useState } from 'react'
import { fetchAvailability, type AvailabilityMap, type DemoMode, type StayParams } from '@/lib/availability'
import type { RoomType } from '@/lib/rooms'

type State = { status: 'idle' | 'loading' | 'ready' | 'error'; data: AvailabilityMap | null }

/** Loads availability whenever the stay changes. With no valid stay it stays idle and no request is made. */
export function useAvailability(rooms: RoomType[], stay: StayParams | null, demo: DemoMode | null) {
  const [state, setState] = useState<State>({ status: 'idle', data: null })
  const [attempt, setAttempt] = useState(0)
  const key = stay ? `${stay.checkIn}|${stay.checkOut}|${stay.adults}|${stay.children}|${demo}|${attempt}` : 'none'

  useEffect(() => {
    if (!stay) {
      setState({ status: 'idle', data: null })
      return
    }
    let cancelled = false
    setState({ status: 'loading', data: null })
    fetchAvailability(stay, rooms, demo)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'error', data: null }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { ...state, retry: () => setAttempt((a) => a + 1) }
}

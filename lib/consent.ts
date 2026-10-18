'use client'

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ConsentState = 'unknown' | 'granted' | 'denied'

interface ConsentContextType {
  consent: ConsentState
  grant: () => void
  deny: () => void
  reset: () => void
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined)

const STORAGE_KEY = 'dea-consent'

/** Persists consent to localStorage. The banner only shows if marketing or analytics may be enabled by the hotel config. */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>('unknown')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'granted' || raw === 'denied') setConsent(raw)
    } catch {
      // Ignore storage read failures (private browsing).
    }
  }, [])

  const value = useMemo(
    () => ({
      consent,
      grant: () => {
        setConsent('granted')
        try { localStorage.setItem(STORAGE_KEY, 'granted') } catch {}
      },
      deny: () => {
        setConsent('denied')
        try { localStorage.setItem(STORAGE_KEY, 'denied') } catch {}
      },
      reset: () => {
        setConsent('unknown')
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
      },
    }),
    [consent],
  )

  return createElement(ConsentContext.Provider, { value }, children)
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}

export function hasConsent(c: ConsentState) {
  return c === 'granted'
}

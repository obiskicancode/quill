'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { useLocalStorage } from '@/hooks/use-local-storage'

export type ConsentState = 'unknown' | 'granted' | 'denied'

interface ConsentContextType {
  consent: ConsentState
  grant: () => void
  deny: () => void
  reset: () => void
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined)

const STORAGE_KEY = 'dea-consent'

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent, removeConsent] = useLocalStorage<ConsentState>(
    STORAGE_KEY,
    'unknown',
    (v) => v,
    (raw) => (raw === 'granted' || raw === 'denied' ? raw : 'unknown'),
  )

  const value = useMemo(
    () => ({
      consent,
      grant: () => setConsent('granted'),
      deny: () => setConsent('denied'),
      reset: removeConsent,
    }),
    [consent, setConsent, removeConsent],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}

export function hasConsent(c: ConsentState) {
  return c === 'granted'
}

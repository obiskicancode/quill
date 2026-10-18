'use client'

import { useEffect, useState } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  serializer: (value: T) => string = (v) => JSON.stringify(v),
  deserializer: (raw: string) => T = (raw) => JSON.parse(raw) as T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        setValue(deserializer(raw))
      }
    } catch {
      // Ignore storage read failures (private browsing).
    }
  }, [key, deserializer])

  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
      try {
        localStorage.setItem(key, serializer(v))
      } catch {
        // Ignore storage write failures.
      }
      return v
    })
  }

  const remove = () => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage removal failures.
    }
    setValue(initialValue)
  }

  return [value, set, remove]
}

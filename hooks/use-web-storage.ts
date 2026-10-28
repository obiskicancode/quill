'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WebStorageType = 'localStorage' | 'sessionStorage';

export function getWebStorage(type: WebStorageType): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window[type];
  } catch {
    return null;
  }
}

export function useWebStorage<T>(
  type: WebStorageType,
  key: string,
  initialValue: T,
  serializer: (value: T) => string = (v) => JSON.stringify(v),
  deserializer: (raw: string) => T = (raw) => JSON.parse(raw) as T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const serializerRef = useRef(serializer);
  const deserializerRef = useRef(deserializer);

  useEffect(() => {
    serializerRef.current = serializer;
    deserializerRef.current = deserializer;
  }, [serializer, deserializer]);

  useEffect(() => {
    const storage = getWebStorage(type);
    if (!storage) return;

    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        // Hydrate from storage after mount (Web Storage is unavailable during SSR).
        setValue(deserializerRef.current(raw));
      }
    } catch {
      // Ignore storage read failures (private browsing).
    }
  }, [key, type]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v =
          typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        try {
          setWebStorageValue(type, key, v, serializerRef.current);
        } catch {
          // Ignore storage write failures.
        }
        return v;
      });
    },
    [key, type],
  );

  const remove = useCallback(() => {
    try {
      removeWebStorageValue(type, key);
    } catch {
      // Ignore storage removal failures.
    }
    setValue(initialValue);
  }, [initialValue, key, type]);

  return [value, set, remove];
}

export function getWebStorageValue<T>(
  type: WebStorageType,
  key: string,
  deserializer: (raw: string) => T = (raw) => JSON.parse(raw) as T,
): T | null {
  const storage = getWebStorage(type);
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      return deserializer(raw);
    }
  } catch {
    // Ignore storage read failures.
  }
  return null;
}

export function setWebStorageValue<T>(
  type: WebStorageType,
  key: string,
  value: T,
  serializer: (value: T) => string = (v) => JSON.stringify(v),
): void {
  try {
    getWebStorage(type)?.setItem(key, serializer(value));
  } catch {
    // Ignore storage write failures.
  }
}

export function removeWebStorageValue(type: WebStorageType, key: string): void {
  try {
    getWebStorage(type)?.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
}

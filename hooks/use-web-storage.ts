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
  const valueRef = useRef<T>(initialValue);
  const initialValueRef = useRef<T>(initialValue);
  const serializerRef = useRef(serializer);
  const deserializerRef = useRef(deserializer);

  useEffect(() => {
    serializerRef.current = serializer;
    deserializerRef.current = deserializer;
    initialValueRef.current = initialValue;
  }, [serializer, deserializer, initialValue]);

  useEffect(() => {
    const storage = getWebStorage(type);
    if (!storage) return;

    try {
      const raw = storage.getItem(key);
      const next =
        raw !== null
          ? deserializerRef.current(raw)
          : // A new key starts from its own default instead of the previous key's value.
            initialValueRef.current;
      valueRef.current = next;
      setValue(next);
    } catch {
      // Ignore storage read failures (private browsing).
    }
  }, [key, type]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      // Write before scheduling the state update
      const v =
        typeof next === 'function'
          ? (next as (prev: T) => T)(valueRef.current)
          : next;
      valueRef.current = v;
      try {
        setWebStorageValue(type, key, v, serializerRef.current);
      } catch {
        // Ignore storage write failures.
      }
      setValue(v);
    },
    [key, type],
  );

  const remove = useCallback(() => {
    try {
      removeWebStorageValue(type, key);
    } catch {
      // Ignore storage removal failures.
    }
    valueRef.current = initialValueRef.current;
    setValue(initialValueRef.current);
  }, [key, type]);

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

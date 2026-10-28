'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { getWebStorage, type WebStorageType } from './use-web-storage';

const DRAFT_PREFIX = 'dela:form-draft:';
const EMPTY_EXCLUDE: readonly never[] = [];

interface FormDraftOptions<T extends FieldValues> {
  enabled?: boolean;
  exclude?: readonly (keyof T)[];
  debounceMs?: number;
  storage?: WebStorageType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDraft(
  defaults: unknown,
  draft: unknown,
  excluded: ReadonlySet<string>,
  topLevel = true,
): unknown {
  if (!isRecord(defaults) || !isRecord(draft)) return defaults;

  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(draft)) {
    if (topLevel && excluded.has(key)) continue;
    if (!(key in defaults)) continue;

    const base = defaults[key];
    merged[key] =
      isRecord(base) && isRecord(value)
        ? mergeDraft(base, value, excluded, false)
        : value;
  }
  return merged;
}

function withoutExcluded<T extends FieldValues>(
  values: T,
  excluded: ReadonlySet<string>,
): T {
  if (excluded.size === 0) return values;

  const copy: Record<string, unknown> = { ...values };
  for (const key of excluded) delete copy[key];
  return copy as T;
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useFormDraft<
  TFieldValues extends FieldValues,
  TContext,
  TTransformedValues,
>(
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>,
  key: string,
  options: FormDraftOptions<TFieldValues> = {},
) {
  const {
    enabled = true,
    exclude = EMPTY_EXCLUDE as readonly (keyof TFieldValues)[],
    debounceMs = 400,
    storage: storageType = 'sessionStorage',
  } = options;
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const formRef = useLatest(form);
  const excludeRef = useLatest(exclude);
  const excludeKey = exclude.join('|');
  const dirtyRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    return formRef.current.subscribe({
      formState: { isDirty: true },
      callback: (state) => {
        dirtyRef.current = state.isDirty ?? false;
      },
    });
  }, [formRef]);

  useEffect(() => {
    if (!enabled) return;

    const storage = getWebStorage(storageType);
    if (storage) {
      try {
        const raw = storage.getItem(storageKey);
        if (raw !== null) {
          const draft = JSON.parse(raw) as unknown;
          const current = formRef.current.getValues();
          const merged = mergeDraft(
            current,
            draft,
            new Set(excludeRef.current.map(String)),
          );
          formRef.current.reset(merged as TFieldValues);
        }
      } catch {
        // Ignore unreadable or malformed drafts.
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- enable persistence after the restore attempt.
    setHydrated(true);
  }, [enabled, excludeRef, formRef, storageKey, storageType]);

  useEffect(() => {
    if (!enabled || !hydrated) return;

    const storage = getWebStorage(storageType);
    if (!storage) return;

    const excluded = new Set(excludeRef.current.map(String));
    let timer: number | null = null;

    const persist = () => {
      timer = null;
      try {
        if (!dirtyRef.current) {
          storage.removeItem(storageKey);
          return;
        }
        storage.setItem(
          storageKey,
          JSON.stringify(
            withoutExcluded(formRef.current.getValues(), excluded),
          ),
        );
      } catch {
        // Ignore storage write failures (private browsing or quota).
      }
    };

    const subscription = formRef.current.watch(() => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(persist, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [
    debounceMs,
    enabled,
    excludeKey,
    excludeRef,
    formRef,
    hydrated,
    storageKey,
    storageType,
  ]);

  const clearDraft = useCallback(() => {
    try {
      getWebStorage(storageType)?.removeItem(storageKey);
    } catch {
      // Ignore storage removal failures.
    }
  }, [storageKey, storageType]);

  return { clearDraft, hydrated };
}

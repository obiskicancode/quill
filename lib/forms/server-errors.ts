/**
 * Bridges API validation failures back into react-hook-form. Only errors that
 * carry `fieldErrors` are applied; anything else is left for the caller's
 * general error handling.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';

/**
 * Applies field-level messages from a `ServiceError` to the form and returns
 * whether any field was updated, so callers can fall back to a banner when the
 * server did not identify a field.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
): boolean {
  if (!(error instanceof ServiceError)) return false;

  const fieldErrors = error.body?.fieldErrors;
  if (!fieldErrors) return false;

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (!message) continue;
    setError(field as Path<T>, { type: 'server', message });
  }

  return Object.keys(fieldErrors).length > 0;
}

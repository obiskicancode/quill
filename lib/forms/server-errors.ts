import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ServiceError } from '@/app/api/services/base.service';

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

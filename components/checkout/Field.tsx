import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FieldA11y {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (a11y: FieldA11y) => ReactNode;
}

export const inputClass = (error?: string) =>
  `min-h-12 w-full rounded-control border bg-surface px-4 text-body placeholder:text-muted/80 disabled:bg-paper disabled:text-muted ${
    error ? 'border-2 border-danger' : 'border-ink/60'
  }`;

/** A visible label, an optional hint, and an error linked with aria-describedby. */
export function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: FieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-small mb-1.5 block font-semibold">
        {label}
        {optional && (
          <span className="text-muted font-normal"> (optional)</span>
        )}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-muted mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="text-small text-danger mt-1.5 flex items-start gap-1.5 font-medium"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

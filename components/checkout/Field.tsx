import { cn } from 'cn';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  FieldDescription,
  FieldError,
  FieldLabel,
  Field as FieldRoot,
} from '@/components/ui/field';

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
  cn(
    'min-h-12 w-full rounded-control border border-input bg-card px-4 text-body text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-paper disabled:text-muted-foreground',
    error && 'border-2 border-destructive',
  );

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
    <FieldRoot data-invalid={Boolean(error)} className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-small font-semibold">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        )}
      </FieldLabel>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <FieldDescription id={`${id}-hint`} className="text-caption">
          {hint}
        </FieldDescription>
      )}
      {error && (
        <FieldError
          id={`${id}-error`}
          className="text-small font-medium"
          aria-live="polite"
        >
          <span className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </span>
        </FieldError>
      )}
    </FieldRoot>
  );
}

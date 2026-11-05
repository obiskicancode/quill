import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * A status label with a leading colour dot. The dot and the tint come from one
 * `tone`, so a row can never paint a green pill with a grey dot.
 */
type Tone = Extract<
  BadgeVariant,
  'success' | 'brand' | 'warning' | 'destructive' | 'neutral'
>;

const dotClass: Record<Tone, string> = {
  success: 'bg-success',
  brand: 'bg-primary',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  neutral: 'bg-muted',
};

export function StatusDotBadge({
  tone,
  className,
  children,
}: {
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge variant={tone} className={cn('gap-1.5 px-2.5', className)}>
      <span
        aria-hidden
        className={cn('size-1.5 shrink-0 rounded-full', dotClass[tone])}
      />
      {children}
    </Badge>
  );
}

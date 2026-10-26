import { cn } from 'cn';
import type { ReactNode } from 'react';

import { Badge as ShadcnBadge } from '@/components/ui/badge';

type Tone = 'neutral' | 'accent' | 'warning' | 'muted' | 'overlay';

const tones: Record<Tone, string> = {
  neutral: 'border-transparent bg-ink/8 text-ink',
  accent: 'border-transparent bg-primary text-primary-foreground',
  warning:
    'border-destructive/40 bg-card text-destructive ring-1 ring-destructive/40',
  muted: 'border-transparent bg-ink text-paper',
  overlay: 'border-transparent bg-ink/80 text-paper',
};

/** Small label composed from shadcn Badge. All pairings are 4.5:1 or better. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ShadcnBadge
      className={cn(
        'text-caption inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 font-semibold',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </ShadcnBadge>
  );
}

/** "Only N left" appears only when two or fewer rooms really remain. "Not available" appears for sold-out dates. */
export function AvailabilityBadge({
  remaining,
  soldOut = false,
}: {
  remaining?: number;
  soldOut?: boolean;
}) {
  if (soldOut) return <Badge tone="muted">Not available</Badge>;
  if (remaining !== undefined && remaining > 0 && remaining <= 2) {
    return <Badge tone="warning">Only {remaining} left</Badge>;
  }
  return null;
}

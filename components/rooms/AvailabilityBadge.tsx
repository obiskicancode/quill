import type { ReactNode } from 'react';

import { Badge as ShadcnBadge, type BadgeVariant } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'overlay';

/**
 * Tones are named for what they mean, not for how they look, and each one reuses
 * a shadcn variant so the tint, the border and the contrast pairing live in one
 * place instead of being retyped per label.
 */
const toneVariant: Record<Tone, BadgeVariant> = {
  neutral: 'info',
  accent: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  overlay: 'neutral',
};

/** The one tone with no shadcn equivalent: it sits on a photo, so it needs an opaque fill. */
const overlayClassName = 'border-transparent bg-ink/80 text-paper';

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
      variant={toneVariant[tone]}
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-caption font-semibold',
        tone === 'overlay' && overlayClassName,
        className,
      )}
    >
      {icon}
      {children}
    </ShadcnBadge>
  );
}

/**
 * The verdict on the dates in the query, shown beside the price. Scarcity is only
 * worth a label at two rooms or fewer; anything else needs the plain "Available",
 * which is the answer the guest pressed the button to get.
 */
export function AvailabilityBadge({
  remaining,
  soldOut = false,
}: {
  remaining?: number;
  soldOut?: boolean;
}) {
  if (soldOut || (remaining !== undefined && remaining <= 0)) {
    return <Badge tone="danger">Not available</Badge>;
  }
  if (remaining === undefined) return null;
  if (remaining <= 2) {
    return <Badge tone="warning">Only {remaining} left</Badge>;
  }
  return <Badge tone="success">Available</Badge>;
}

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONE = {
  brand: 'bg-primary text-primary-foreground',
  success: 'bg-success/12 text-success',
} as const;

const SIZE = {
  lead: 'size-12 [&>svg]:size-6',
  /** Sits in a dense row beside two lines of text. */
  inline: 'size-10 [&>svg]:size-5',
} as const;

interface IconBadgeProps {
  children: ReactNode;
  tone?: keyof typeof TONE;
  size?: keyof typeof SIZE;
  className?: string;
}

export function IconBadge({
  children,
  tone = 'brand',
  size = 'lead',
  className,
}: IconBadgeProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full',
        TONE[tone],
        SIZE[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SuccessMark({
  size = 'lead',
  className,
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <IconBadge tone="success" size={size} className={className}>
      <Check />
    </IconBadge>
  );
}

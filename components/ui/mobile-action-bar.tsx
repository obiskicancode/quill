import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const UNTIL = {
  md: 'md:hidden',
  lg: 'lg:hidden',
} as const;

interface MobileActionBarProps {
  children: ReactNode;
  until?: keyof typeof UNTIL;
  id?: string;
  collapsed?: boolean;
  className?: string;
}

export function MobileActionBar({
  children,
  until = 'lg',
  id,
  collapsed = false,
  className,
}: MobileActionBarProps) {
  return (
    <div
      id={id}
      data-slot="mobile-action-bar"
      data-until={until}
      data-collapsed={collapsed || undefined}
      className={cn(
        'fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-line bg-paper/95 px-4 pt-3 pr-22 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur',
        'transition-[transform,visibility] duration-200 motion-reduce:transition-none',
        UNTIL[until],
        collapsed && 'invisible translate-y-full',
        className,
      )}
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}

export function ActionBarAmount({
  label,
  amount,
  className,
}: {
  label?: ReactNode;
  amount: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('shrink-0 text-small', className)}>
      {label && <span className="block text-muted-foreground">{label}</span>}
      <span className="font-semibold tabular-nums">{amount}</span>
    </p>
  );
}

export function ActionBarSummary({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">{primary}</p>
      {secondary && (
        <p className="truncate text-small text-muted-foreground">{secondary}</p>
      )}
    </div>
  );
}

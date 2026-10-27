'use client';

import Link from 'next/link';
import { ArrowUpRight, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { StaggerItem } from '@/components/motion/StaggerItem';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  href: string;
  ariaLabel: string;
  tooltip?: string;
  icon?: ReactNode;
  progressPercent?: number;
}

export function KpiCard({
  label,
  value,
  subtitle,
  href,
  ariaLabel,
  tooltip,
  icon,
  progressPercent,
}: KpiCardProps) {
  return (
    <StaggerItem scale as="div" className="h-full">
      <Link
        href={href}
        aria-label={ariaLabel}
        className="group rounded-card border-line bg-card shadow-raised hover:border-ink/30 relative flex h-full min-h-34 flex-col justify-between border p-4 transition-all duration-150 hover:-translate-y-0.5 sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {icon && (
              <span className="shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="text-small text-muted-foreground font-medium">
              {label}
            </span>
            {tooltip && (
              <span
                tabIndex={0}
                role="tooltip"
                title={tooltip}
                aria-label={tooltip}
                className="text-muted-foreground hover:text-ink inline-flex cursor-help focus:outline-none"
              >
                <HelpCircle className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
          <span className="rounded-control bg-paper text-muted-foreground group-hover:bg-primary group-hover:text-ink grid size-7 shrink-0 place-items-center transition-colors">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-2">
          <div className="font-display text-h2 text-ink font-semibold tracking-tight">
            {value}
          </div>
          {typeof progressPercent === 'number' && (
            <div className="bg-paper border-line mt-2 h-1.5 w-full overflow-hidden rounded-full border">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                }}
              />
            </div>
          )}
          {subtitle && (
            <p className="text-caption text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </Link>
    </StaggerItem>
  );
}

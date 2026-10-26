'use client';

import Link from 'next/link';
import { ArrowUpRight, HelpCircle } from 'lucide-react';

import { StaggerItem } from '@/components/motion/StaggerItem';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  href: string;
  ariaLabel: string;
  tooltip?: string;
}

export function KpiCard({
  label,
  value,
  subtitle,
  href,
  ariaLabel,
  tooltip,
}: KpiCardProps) {
  return (
    <StaggerItem scale as="div">
      <Link
        href={href}
        aria-label={ariaLabel}
        className="group rounded-card border-line bg-surface shadow-raised hover:border-ink/30 relative flex min-h-[7.5rem] flex-col justify-between border p-4 transition-all duration-150 hover:-translate-y-0.5 sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-small text-muted font-medium">{label}</span>
            {tooltip && (
              <span
                tabIndex={0}
                role="tooltip"
                title={tooltip}
                aria-label={tooltip}
                className="text-muted hover:text-ink inline-flex cursor-help focus:outline-none"
              >
                <HelpCircle className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
          <span className="rounded-control bg-paper text-muted group-hover:bg-accent group-hover:text-ink grid size-7 shrink-0 place-items-center transition-colors">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-2">
          <div className="font-display text-h2 text-ink font-semibold tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-caption text-muted mt-1">{subtitle}</p>
          )}
        </div>
      </Link>
    </StaggerItem>
  );
}

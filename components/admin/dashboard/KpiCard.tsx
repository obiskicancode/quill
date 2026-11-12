'use client';

import Link from 'next/link';
import { ArrowUpRight, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { StaggerItem } from '@/components/motion/StaggerItem';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
        className="group relative flex h-full min-h-34 flex-col justify-between rounded-card border border-line bg-card p-4 shadow-raised transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/30 sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {icon && (
              <span className="shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="text-small font-medium text-muted-foreground">
              {label}
            </span>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex cursor-help items-center text-muted-foreground hover:text-ink" />
                  }
                >
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-56 font-sans text-caption text-wrap"
                >
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className="grid size-7 shrink-0 place-items-center rounded-control bg-paper text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-ink">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-2">
          <div className="font-display text-h2 font-semibold tracking-tight text-ink">
            {value}
          </div>
          {typeof progressPercent === 'number' && (
            <Progress
              aria-label={label}
              value={Math.min(100, Math.max(0, progressPercent))}
              className="mt-2"
            />
          )}
          {subtitle && (
            <p className="mt-1 text-caption text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </Link>
    </StaggerItem>
  );
}

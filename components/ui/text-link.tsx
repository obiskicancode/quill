import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const base =
  'font-semibold underline underline-offset-4 transition-[text-decoration-color]';

const TONE = {
  brand: cn(base, 'decoration-brand decoration-2 hover:decoration-current'),
  quiet: cn(base, 'decoration-line hover:decoration-ink'),
} as const;

type TextLinkTone = keyof typeof TONE;

export const textLinkRecipe = TONE.brand;

export const textLinkClasses = cn(textLinkRecipe, '-mx-1 px-1 py-3');

interface TextLinkProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  tone?: TextLinkTone;
  className?: string;
}

export function TextLink({
  href,
  children,
  external = false,
  tone = 'brand',
  className = '',
}: TextLinkProps) {
  const classes = cn(TONE[tone], '-mx-1 px-1 py-3', className);
  if (external || !href.startsWith('/')) {
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

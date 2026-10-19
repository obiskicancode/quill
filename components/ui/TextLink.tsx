import Link from 'next/link';
import type { ReactNode } from 'react';

interface TextLinkProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}

/** Underlined text link with a 44px tap height. Inherits colour so it works on light and dark sections. */
export function TextLink({
  href,
  children,
  external = false,
  className = '',
}: TextLinkProps) {
  const classes = `inline-flex min-h-11 items-center font-semibold underline decoration-accent decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-current ${className}`;
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

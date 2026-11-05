'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface PageHeadingProps {
  id: string;
  className?: string;
  children: ReactNode;
}

/** An h1 that takes focus on mount, so a keyboard or screen-reader user landing on an error or not-found page starts at the heading. */
export function PageHeading({
  id,
  className = '',
  children,
}: PageHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <h1 ref={ref} tabIndex={-1} id={id} className={className}>
      {children}
    </h1>
  );
}

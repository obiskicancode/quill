'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Wraps site chrome that must not appear on /checkout /booking/confirmation or /booking/manage (each brings its own header and footer). */
export function HideOnCheckout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return ['/checkout', '/booking/confirmation', '/booking/manage'].some((p) =>
    pathname.startsWith(p),
  ) ? null : (
    <>{children}</>
  );
}

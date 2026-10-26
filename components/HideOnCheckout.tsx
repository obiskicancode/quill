'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Hides public site chrome on focused flows and the admin app. */
export function HideOnCheckout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return [
    '/checkout',
    '/booking/confirmation',
    '/booking/manage',
    '/admin',
  ].some((p) => pathname.startsWith(p)) ? null : (
    <>{children}</>
  );
}

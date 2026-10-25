'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { SiteConfig } from '@/types/site.types';

const SiteContext = createContext<SiteConfig | undefined>(undefined);

export function SiteProvider({
  site,
  children,
}: {
  site: SiteConfig;
  children: ReactNode;
}) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error(ERROR_MESSAGES.SITE_PROVIDER_MISSING);
  return site;
}

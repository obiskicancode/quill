'use client';

import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

const QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(QUERY_CONFIG));

  useEffect(() => {
    const clearSessionCache = () => queryClient.clear();
    window.addEventListener('admin:session-expired', clearSessionCache);
    return () =>
      window.removeEventListener('admin:session-expired', clearSessionCache);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ReactQueryDevtoolsPanel } from '@/components/providers/react-query-devtools';
import { ApiClientError } from '@/features/catalog/api/client';

/**
 * Server-state defaults for the whole app. Catalog data is comparatively
 * static: it stays fresh for a minute, survives ten minutes of inactivity in
 * cache, and is not refetched just because the window regains focus. Client
 * (4xx) failures are deterministic — never retried; transient failures get
 * two retries.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtoolsPanel />
    </QueryClientProvider>
  );
}

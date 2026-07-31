'use client';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { env } from '@/config/env';

export function ReactQueryDevtoolsPanel() {
  if (!env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS) {
    return null;
  }

  return <ReactQueryDevtools buttonPosition="bottom-left" />;
}

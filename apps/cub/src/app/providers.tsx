'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so each browser tab gets exactly one client, and so the
  // client is never shared across requests on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The app is used on flaky mobile data; keep cached data on screen
            // rather than flashing a spinner on every focus change.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

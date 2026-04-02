'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 404 or 401 errors
              if (error?.message?.includes('404') || error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('not found')) {
                return false;
              }
              // Retry up to 1 time for other errors
              return failureCount < 1;
            },
          },
          // React Query v5 typings do not allow `onError` here.
          // Error handling is done at the component level (via `error` result) or via `try/catch` in mutations.
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

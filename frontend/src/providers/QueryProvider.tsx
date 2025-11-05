'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute (default for all queries)
      gcTime: 5 * 60 * 1000, // 5 minutes (garbage collection time),
      // refetchInterval: false, // disable auto-refetch (default for all queries)
      refetchOnWindowFocus: false, // Refetch when user switches back to tab
      retry: 2
    },
    mutations: {
      retry: 1
    }
  }
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition='bottom-right' position='bottom' />
      )}
    </QueryClientProvider>
  );
}

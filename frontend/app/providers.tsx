"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Wraps the app in a TanStack Query client so any component can use
 * `useQuery` / `useMutation` for cached, deduplicated server data.
 *
 * The client is created in state (once per browser session) rather than at
 * module scope, so each user gets their own cache and it survives re-renders.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 30s — within that window, revisiting
            // a page serves instantly from cache instead of refetching.
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

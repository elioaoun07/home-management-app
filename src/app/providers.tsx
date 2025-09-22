// src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useMemo } from "react";
import { ThemeProvider } from "../components/theme-provider";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

const RQ_PERSIST_KEY = "hm-rq-cache-v1";
const STABLE_KEYS = new Set([
  "accounts",
  "categories",
  "section-order",
  "templates",
]); // (subcategories is nested under categories key)

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // stable lookups never become stale
            refetchOnWindowFocus: true, // won't refetch because never stale
            refetchOnReconnect: true,
            retry: 2,
          },
          mutations: {
            retry: 1,
            // networkMode: "offlineFirst", // uncomment later for full offline UX
          },
        },
      }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Persist only “stable” queries to localStorage
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: RQ_PERSIST_KEY,
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24h
      buster: "hm-v1",
      dehydrateOptions: {
        // only persist successful stable keys
        shouldDehydrateQuery: (q) =>
          q.state.status === "success" &&
          typeof q.queryKey?.[0] === "string" &&
          STABLE_KEYS.has(q.queryKey[0] as string),
      },
    });

    // Clear ONLY the persisted RQ cache on Supabase user switch
    (async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      );

      let currentUserId: string | null = null;
      const { data } = await supabase.auth.getUser();
      currentUserId = data.user?.id ?? null;

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
        const nextUserId = sess?.user?.id ?? null;
        if (nextUserId !== currentUserId) {
          try {
            localStorage.removeItem(RQ_PERSIST_KEY);
            // Clear local user preferences and theme on user switch
            localStorage.removeItem("user_preferences");
            localStorage.removeItem("hm-theme");
          } catch {}
          queryClient.clear();
          currentUserId = nextUserId;
        }
      });

      return () => sub.subscription.unsubscribe();
    })();
  }, [queryClient]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

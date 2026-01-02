"use client"

import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, useEffect } from "react"

// Persist query cache to localStorage
const CACHE_KEY = "kapellar-query-cache"

function persistQueryCache(client: QueryClient) {
  try {
    const cache = client.getQueryCache().getAll()
    const dataToStore = cache
      .filter((query) => query.state.status === "success")
      .map((query) => ({
        queryKey: query.queryKey,
        state: query.state,
      }))
    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToStore))
  } catch {
    // Ignore storage errors
  }
}

function restoreQueryCache(client: QueryClient) {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      data.forEach((item: { queryKey: unknown[]; state: { data: unknown } }) => {
        client.setQueryData(item.queryKey, item.state.data)
      })
    }
  } catch {
    // Ignore restore errors
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              // Don't retry on auth errors
              if (error instanceof Error && error.message.includes("401")) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Use cached data while offline
            networkMode: "offlineFirst",
          },
          mutations: {
            retry: false,
            networkMode: "offlineFirst",
          },
        },
      })
  )

  useEffect(() => {
    // Restore cache on mount
    restoreQueryCache(queryClient)

    // Listen for online/offline events
    const handleOnline = () => {
      onlineManager.setOnline(true)
    }

    const handleOffline = () => {
      onlineManager.setOnline(false)
      // Persist cache when going offline
      persistQueryCache(queryClient)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Persist cache periodically
    const interval = setInterval(() => {
      if (navigator.onLine) {
        persistQueryCache(queryClient)
      }
    }, 60000) // Every minute

    // Persist on page unload
    const handleBeforeUnload = () => {
      persistQueryCache(queryClient)
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      clearInterval(interval)
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

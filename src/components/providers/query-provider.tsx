"use client"

import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, useEffect } from "react"

// Persist query cache to localStorage
const CACHE_KEY = "kapellar-query-cache"
const CACHE_TIMESTAMP_KEY = "kapellar-query-cache-timestamp"
const MAX_CACHE_AGE = 10 * 60 * 1000 // 10 minutes max cache age

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
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
  } catch {
    // Ignore storage errors
  }
}

function restoreQueryCache(client: QueryClient) {
  try {
    // Check cache age
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    if (timestamp) {
      const cacheAge = Date.now() - parseInt(timestamp)
      // If cache is too old, clear it
      if (cacheAge > MAX_CACHE_AGE) {
        localStorage.removeItem(CACHE_KEY)
        localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        return
      }
    }

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
            staleTime: 30 * 1000, // 30 seconds - data becomes stale quickly
            gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
            refetchOnWindowFocus: true, // Refresh when user comes back
            refetchOnReconnect: true, // Refresh when back online
            refetchOnMount: true, // Always check for fresh data on mount
            retry: (failureCount, error) => {
              // Don't retry on auth errors
              if (error instanceof Error && error.message.includes("401")) {
                return false
              }
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
    // Restore cache on mount (only if offline)
    if (!navigator.onLine) {
      restoreQueryCache(queryClient)
    }

    // Listen for online/offline events
    const handleOnline = () => {
      onlineManager.setOnline(true)
      // Invalidate all queries when back online to get fresh data
      queryClient.invalidateQueries()
    }

    const handleOffline = () => {
      onlineManager.setOnline(false)
      // Persist cache when going offline
      persistQueryCache(queryClient)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Persist cache periodically (less frequently)
    const interval = setInterval(() => {
      persistQueryCache(queryClient)
    }, 5 * 60 * 1000) // Every 5 minutes

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
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

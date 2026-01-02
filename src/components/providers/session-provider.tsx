"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { useEffect } from "react"

const SESSION_CACHE_KEY = "kapellar-session-cache"

// Cache session to localStorage for offline use
function cacheSession() {
  // This runs client-side to backup session info
  if (typeof window === "undefined") return

  const cookies = document.cookie
  if (cookies.includes("authjs.session-token") || cookies.includes("__Secure-authjs.session-token")) {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      hasSession: true,
      cachedAt: Date.now(),
    }))
  }
}

function SessionCacheManager() {
  useEffect(() => {
    // Cache session on mount
    cacheSession()

    // Cache session periodically
    const interval = setInterval(cacheSession, 30000) // Every 30 seconds

    // Cache on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cacheSession()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return null
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Disable automatic session refetching when offline
      refetchOnWindowFocus={false}
      // Only refetch session every 5 minutes instead of default
      refetchInterval={5 * 60}
      // Don't refetch when coming back online immediately - wait for user action
      refetchWhenOffline={false}
    >
      <SessionCacheManager />
      {children}
    </NextAuthSessionProvider>
  )
}

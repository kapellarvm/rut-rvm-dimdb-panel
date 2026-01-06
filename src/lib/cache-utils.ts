// Utility functions for cache management

/**
 * Clear Service Worker API cache
 * Call this after mutations to ensure fresh data
 */
export async function clearApiCache(): Promise<void> {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "CLEAR_API_CACHE",
    })
  }
}

/**
 * Refresh specific API endpoint in SW cache
 */
export async function refreshApiCache(endpoint: string): Promise<void> {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "REFRESH_ENDPOINT",
      endpoint,
    })
  }
}

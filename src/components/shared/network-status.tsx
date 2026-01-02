"use client"

import { useState, useEffect } from "react"
import { WifiOff, Wifi, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)
    setShowBanner(!navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Keep banner visible briefly to show reconnection
      if (wasOffline) {
        setTimeout(() => setShowBanner(false), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
      setWasOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [wasOffline])

  if (!showBanner) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isOnline
          ? "bg-green-500/95 text-white"
          : "bg-orange-500/95 text-white"
      }`}
    >
      <div className="safe-area-top" />
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Bağlantı yeniden kuruldu</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-white hover:bg-white/20"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Yenile
            </Button>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span>Çevrimdışı - Önbelleğe alınmış veriler gösteriliyor</span>
          </>
        )}
      </div>
    </div>
  )
}

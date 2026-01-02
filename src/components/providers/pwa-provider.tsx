"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("pwa-install-dismissed")
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt)
      const dayInMs = 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < dayInMs) {
        return
      }
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope)
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error)
        })
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a delay for better UX
      setTimeout(() => setShowInstallBanner(true), 3000)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setIsInstalled(true)
    }

    setShowInstallBanner(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  return (
    <>
      {children}

      {/* PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom animate-in slide-in-from-bottom duration-300">
          <Card className="max-w-md mx-auto p-4 bg-[var(--card)] border-orange-500/20 shadow-lg shadow-orange-500/10">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Uygulamayı İndir</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Ana ekrana ekleyerek hızlı erişim sağlayın
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall} className="h-8">
                    Yükle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="h-8"
                  >
                    Daha Sonra
                  </Button>
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleDismiss}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

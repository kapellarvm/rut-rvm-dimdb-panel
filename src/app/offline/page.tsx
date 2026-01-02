"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-orange-500/10 flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-orange-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Bağlantı Yok</h1>
          <p className="text-[var(--muted-foreground)]">
            İnternet bağlantınız kopmuş görünüyor. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tekrar Dene
        </Button>

        <p className="text-xs text-[var(--muted-foreground)]">
          Son görüntülenen sayfalar önbellekten yüklenebilir.
        </p>
      </div>
    </div>
  )
}

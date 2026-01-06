"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RefreshButtonProps {
  onClick: () => void
  isLoading?: boolean
  isFetching?: boolean
  dataUpdatedAt?: number
  className?: string
}

function formatLastUpdate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 10000) return "Az önce"
  if (diff < 60000) return `${Math.floor(diff / 1000)} sn önce`
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`
  return new Date(timestamp).toLocaleDateString("tr-TR")
}

export function RefreshButton({
  onClick,
  isLoading,
  isFetching,
  dataUpdatedAt,
  className,
}: RefreshButtonProps) {
  const isRefreshing = isLoading || isFetching

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {dataUpdatedAt && !isRefreshing && (
        <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
          {formatLastUpdate(dataUpdatedAt)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isRefreshing}
        className="h-9 px-3"
      >
        <RefreshCw
          className={cn(
            "h-4 w-4 mr-2",
            isRefreshing && "animate-spin"
          )}
        />
        {isRefreshing ? "Yenileniyor..." : "Yenile"}
      </Button>
    </div>
  )
}

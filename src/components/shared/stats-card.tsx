"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  iconClassName?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <Card className={cn("p-6 hover-lift", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {title}
          </p>
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive
                    ? "text-[var(--success)]"
                    : "text-[var(--destructive)]"
                )}
              >
                {trend.isPositive ? "+" : "-"}{trend.value}%
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                son 7 gün
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-3",
            iconClassName || "bg-[var(--primary)]/10"
          )}
        >
          <Icon className={cn("h-6 w-6", iconClassName ? "" : "text-[var(--primary)]")} />
        </div>
      </div>
    </Card>
  )
}

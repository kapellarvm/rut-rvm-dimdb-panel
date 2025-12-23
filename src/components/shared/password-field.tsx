"use client"

import * as React from "react"
import { Eye, EyeOff, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface PasswordFieldProps {
  value: string
  label?: string
  className?: string
}

export function PasswordField({ value, label, className }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const maskedValue = "•".repeat(Math.min(value?.length || 8, 12))

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({
        title: "Kopyalandı!",
        description: label ? `${label} panoya kopyalandı.` : "Şifre panoya kopyalandı.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Hata",
        description: "Kopyalama başarısız oldu.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm min-w-[100px]">
        {isVisible ? value : maskedValue}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsVisible(!isVisible)}
          className="h-7 w-7"
        >
          {isVisible ? (
            <EyeOff className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="h-7 w-7"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--success)]" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          )}
        </Button>
      </div>
    </div>
  )
}

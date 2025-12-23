"use client"

import * as React from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"

interface CopyButtonProps {
  value: string
  label?: string
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({
        title: "Kopyalandı!",
        description: label ? `${label} panoya kopyalandı.` : "Değer panoya kopyalandı.",
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Kopyalandı!" : "Kopyala"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

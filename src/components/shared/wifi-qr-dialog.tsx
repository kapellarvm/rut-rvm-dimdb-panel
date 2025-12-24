"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { Wifi, Download, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface WifiQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ssid: string
  password: string
  routerName?: string
}

export function WifiQrDialog({
  open,
  onOpenChange,
  ssid,
  password,
  routerName,
}: WifiQrDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && ssid && password) {
      // WiFi QR code format: WIFI:T:WPA;S:<SSID>;P:<password>;;
      const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`

      QRCode.toDataURL(wifiString, {
        width: 256,
        margin: 2,
        color: {
          dark: "#f97316", // Orange color matching theme
          light: "#1a1a1f", // Dark background matching theme
        },
      })
        .then(setQrDataUrl)
        .catch(console.error)
    }
  }, [open, ssid, password])

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement("a")
    link.download = `WiFi_QR_${ssid}.png`
    link.href = qrDataUrl
    link.click()

    toast({
      title: "Indirildi",
      description: "QR kod indirildi.",
      variant: "success",
    })
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Kopyalandı",
        description: "WiFi şifresi panoya kopyalandı.",
        variant: "success",
      })
    } catch {
      toast({
        title: "Hata",
        description: "Kopyalama başarısız oldu.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-[var(--primary)]" />
            WiFi Bağlantısı
          </DialogTitle>
          <DialogDescription>
            {routerName && `${routerName} - `}Telefonunuzla QR kodu tarayarak bağlanın
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {qrDataUrl ? (
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <img
                src={qrDataUrl}
                alt="WiFi QR Code"
                className="w-48 h-48"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-[var(--secondary)] rounded-xl animate-pulse" />
          )}

          <div className="w-full space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">SSID</p>
                <p className="font-mono font-medium">{ssid}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Şifre</p>
                <p className="font-mono font-medium">{password}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyPassword}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--success)]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!qrDataUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              QR Kodu Indir
            </Button>
          </div>

          <p className="text-xs text-center text-[var(--muted-foreground)]">
            Telefonunuzun kamera uygulamasıyla QR kodu tarayarak WiFi ağına otomatik bağlanabilirsiniz.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

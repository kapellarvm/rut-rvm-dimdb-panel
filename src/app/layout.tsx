import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Kapellar | RVM Yönetim Paneli",
  description: "Router, RVM ve DIM-DB yönetim paneli",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

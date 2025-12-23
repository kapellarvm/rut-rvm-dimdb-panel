"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Router,
  Server,
  Database,
  FileUp,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Router'lar", href: "/dashboard/routers", icon: Router },
  { name: "RVM Birimleri", href: "/dashboard/rvm", icon: Server },
  { name: "DIM-DB", href: "/dashboard/dimdb", icon: Database },
  { name: "Excel Import", href: "/dashboard/import", icon: FileUp },
]

const adminNavigation = [
  { name: "Kullanıcılar", href: "/dashboard/users", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const NavLinks = () => (
    <>
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      {isAdmin && (
        <>
          <Separator className="my-4" />
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Admin
            </p>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Server className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">RUT Panel</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-14 bottom-0 w-72 border-r border-[var(--border)] bg-[var(--background)] p-4">
            <ScrollArea className="h-full">
              <NavLinks />
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-72 lg:flex-col border-r border-[var(--border)] bg-[var(--background)]">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
          <div className="h-9 w-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Server className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">RUT Panel</span>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <NavLinks />
        </ScrollArea>

        <div className="border-t border-[var(--border)] p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-[var(--secondary)] transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)]">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {session?.user?.role === "SUPER_ADMIN" ? "Süper Admin" : "İzleyici"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--destructive)]"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}

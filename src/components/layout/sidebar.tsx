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
  Key,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"

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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Şifre değiştirilemedi")
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şifreniz başarıyla değiştirildi.",
        variant: "success",
      })
      setPasswordDialogOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Şifre değiştirilemedi",
        variant: "destructive",
      })
    },
  })

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Uyarı",
        description: "Tüm alanları doldurun.",
        variant: "destructive",
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Uyarı",
        description: "Yeni şifreler eşleşmiyor.",
        variant: "destructive",
      })
      return
    }
    if (newPassword.length < 6) {
      toast({
        title: "Uyarı",
        description: "Yeni şifre en az 6 karakter olmalı.",
        variant: "destructive",
      })
      return
    }
    changePasswordMutation.mutate({ currentPassword, newPassword })
  }

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
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md px-4 py-3 lg:hidden safe-area-top">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-orange-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <span className="font-bold text-white text-sm">K</span>
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">Kapellar</span>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 border-r border-[var(--border)] bg-[var(--background)] animate-slide-up safe-area-top safe-area-bottom">
            {/* Mobile sidebar header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-orange-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                  <span className="font-bold text-white text-sm">K</span>
                </div>
                <span className="font-bold text-lg">Kapellar</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="touch-target"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile sidebar content */}
            <ScrollArea className="h-[calc(100%-4rem)] px-4 py-4">
              <NavLinks />

              {/* Mobile-only user section */}
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl p-2 bg-[var(--secondary)]/50">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)]">
                      {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {session?.user?.role === "SUPER_ADMIN" ? "Süper Admin" : session?.user?.role === "ADMIN" ? "Admin" : "İzleyici"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 touch-target"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setPasswordDialogOpen(true)
                  }}
                >
                  <Key className="h-5 w-5" />
                  Şifre Değiştir
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 touch-target text-[var(--destructive)]"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-5 w-5" />
                  Çıkış Yap
                </Button>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-72 lg:flex-col border-r border-[var(--border)] bg-gradient-to-b from-[var(--sidebar)] to-[var(--background)]">
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-orange-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
            <span className="font-bold text-white text-lg">K</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">Kapellar</span>
            <span className="text-[10px] text-[var(--muted-foreground)] -mt-0.5">RVM Management</span>
          </div>
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
              <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                <Key className="mr-2 h-4 w-4" />
                Şifre Değiştir
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

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
            <DialogDescription>
              Güvenliğiniz için şifrenizi düzenli olarak değiştirin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mevcut Şifre</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifrenizi girin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false)
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Şifreyi Değiştir"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

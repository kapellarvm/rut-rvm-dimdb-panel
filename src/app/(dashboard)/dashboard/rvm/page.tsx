"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Server,
  Search,
  Plus,
  MoreHorizontal,
  Router,
  MapPin,
  Trash2,
  Edit,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { PasswordField } from "@/components/shared/password-field"
import { CopyButton } from "@/components/shared/copy-button"
import { toast } from "@/hooks/use-toast"
import { formatMacAddress } from "@/lib/utils"
import type { RvmUnit, Router as RouterType, DimDb } from "@/types"

interface RvmWithRouters extends RvmUnit {
  routers: (RouterType & { dimDb: DimDb | null })[]
  _count: { routers: number }
}

export default function RvmPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const [search, setSearch] = useState("")
  const [selectedRvm, setSelectedRvm] = useState<RvmWithRouters | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newRvmId, setNewRvmId] = useState("")
  const [newRvmName, setNewRvmName] = useState("")
  const [newRvmLocation, setNewRvmLocation] = useState("")

  // Fetch RVM units
  const { data: rvmUnits, isLoading } = useQuery<RvmWithRouters[]>({
    queryKey: ["rvm-units", search],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        includeRouters: "true",
      })
      const res = await fetch(`/api/rvm?${params}`)
      if (!res.ok) throw new Error("Failed to fetch RVM units")
      return res.json()
    },
  })

  // Create RVM mutation
  const createMutation = useMutation({
    mutationFn: async (data: { rvmId: string; name?: string; location?: string }) => {
      const res = await fetch("/api/rvm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create RVM")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      toast({
        title: "Başarılı",
        description: "RVM birimi oluşturuldu.",
        variant: "success",
      })
      setCreateDialogOpen(false)
      setNewRvmId("")
      setNewRvmName("")
      setNewRvmLocation("")
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "RVM birimi oluşturulamadı.",
        variant: "destructive",
      })
    },
  })

  // Delete RVM mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rvm/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete RVM")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      toast({
        title: "Başarılı",
        description: "RVM birimi silindi.",
        variant: "success",
      })
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "RVM birimi silinemedi.",
        variant: "destructive",
      })
    },
  })

  const handleCreate = () => {
    if (!newRvmId) return
    createMutation.mutate({
      rvmId: newRvmId,
      name: newRvmName || undefined,
      location: newRvmLocation || undefined,
    })
  }

  const filteredRvmUnits = rvmUnits?.filter(
    (rvm) =>
      rvm.rvmId.toLowerCase().includes(search.toLowerCase()) ||
      rvm.name?.toLowerCase().includes(search.toLowerCase()) ||
      rvm.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="RVM Birimleri"
        description="RVM birimlerini ve bağlı router'ları görüntüleyin"
      >
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni RVM
          </Button>
        )}
      </PageHeader>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="RVM ID, isim veya konum ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* RVM Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))
        ) : filteredRvmUnits?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
            RVM birimi bulunamadı
          </div>
        ) : (
          filteredRvmUnits?.map((rvm) => (
            <Card
              key={rvm.id}
              className="hover-lift cursor-pointer"
              onClick={() => setSelectedRvm(rvm)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Server className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{rvm.rvmId}</CardTitle>
                    {rvm.name && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {rvm.name}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          // Edit functionality
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[var(--destructive)]"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (
                            confirm(
                              "Bu RVM birimini silmek istediğinize emin misiniz?"
                            )
                          ) {
                            deleteMutation.mutate(rvm.id)
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Router className="h-4 w-4" />
                    <span>{rvm._count.routers} router</span>
                  </div>
                  {rvm.location && (
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <MapPin className="h-4 w-4" />
                      <span>{rvm.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {rvm.routers.filter((r) => r.dimDb).length > 0 && (
                    <Badge variant="success">
                      {rvm.routers.filter((r) => r.dimDb).length} atanmış
                    </Badge>
                  )}
                  {rvm.routers.filter((r) => !r.dimDb).length > 0 && (
                    <Badge variant="warning">
                      {rvm.routers.filter((r) => !r.dimDb).length} bekleyen
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* RVM Detail Dialog */}
      <Dialog
        open={!!selectedRvm}
        onOpenChange={(open) => !open && setSelectedRvm(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              {selectedRvm?.rvmId}
            </DialogTitle>
            <DialogDescription>
              {selectedRvm?.name || "RVM Birimi"}
              {selectedRvm?.location && ` - ${selectedRvm.location}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRvm && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Badge variant="secondary">
                  {selectedRvm._count.routers} router
                </Badge>
                {selectedRvm.routers.filter((r) => r.dimDb).length > 0 && (
                  <Badge variant="success">
                    {selectedRvm.routers.filter((r) => r.dimDb).length} DIM-DB atanmış
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Bağlı Router&apos;lar</h4>
                {selectedRvm.routers.length === 0 ? (
                  <p className="text-[var(--muted-foreground)]">
                    Bu RVM&apos;e bağlı router yok
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedRvm.routers.map((router) => (
                      <Card key={router.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{router.boxNo}</span>
                              {router.dimDb ? (
                                <Badge variant="success">
                                  {router.dimDb.dimDbCode}
                                </Badge>
                              ) : (
                                <Badge variant="warning">Atanmamış</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--muted-foreground)]">
                                  S/N:
                                </span>
                                <span className="font-mono">
                                  {router.serialNumber}
                                </span>
                                <CopyButton
                                  value={router.serialNumber}
                                  label="Seri No"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--muted-foreground)]">
                                  MAC:
                                </span>
                                <span className="font-mono text-xs">
                                  {formatMacAddress(router.macAddress)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--muted-foreground)]">
                                  WiFi:
                                </span>
                                {router.wifiPassword ? (
                                  <PasswordField
                                    value={router.wifiPassword}
                                    label="WiFi"
                                  />
                                ) : (
                                  "-"
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--muted-foreground)]">
                                  Panel:
                                </span>
                                {router.devicePassword ? (
                                  <PasswordField
                                    value={router.devicePassword}
                                    label="Panel"
                                  />
                                ) : (
                                  "-"
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create RVM Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni RVM Birimi</DialogTitle>
            <DialogDescription>
              Yeni bir RVM birimi oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rvmId">RVM ID *</Label>
              <Input
                id="rvmId"
                placeholder="Örn: KPL0402511010"
                value={newRvmId}
                onChange={(e) => setNewRvmId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">İsim (Opsiyonel)</Label>
              <Input
                id="name"
                placeholder="Örn: Ana Bina RVM"
                value={newRvmName}
                onChange={(e) => setNewRvmName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Konum (Opsiyonel)</Label>
              <Input
                id="location"
                placeholder="Örn: İstanbul"
                value={newRvmLocation}
                onChange={(e) => setNewRvmLocation(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newRvmId || createMutation.isPending}
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

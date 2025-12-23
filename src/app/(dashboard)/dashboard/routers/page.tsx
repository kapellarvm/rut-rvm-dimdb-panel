"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Search,
  Filter,
  ExternalLink,
  MoreHorizontal,
  Database,
  Trash2,
  Eye,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PasswordField } from "@/components/shared/password-field"
import { CopyButton } from "@/components/shared/copy-button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { formatMacAddress } from "@/lib/utils"
import type { Router, RvmUnit, DimDb } from "@/types"

interface RoutersResponse {
  data: (Router & { rvmUnit: RvmUnit | null; dimDb: DimDb | null })[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export default function RoutersPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const [search, setSearch] = useState("")
  const [dimDbStatus, setDimDbStatus] = useState("all")
  const [rvmFilter, setRvmFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDimDb, setSelectedDimDb] = useState<string>("")

  // Fetch routers
  const { data: routersData, isLoading } = useQuery<RoutersResponse>({
    queryKey: ["routers", search, dimDbStatus, rvmFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        search,
        dimDbStatus: dimDbStatus !== "all" ? dimDbStatus : "",
        rvmUnitId: rvmFilter !== "all" ? rvmFilter : "",
      })
      const res = await fetch(`/api/routers?${params}`)
      if (!res.ok) throw new Error("Failed to fetch routers")
      return res.json()
    },
  })

  // Fetch RVM units for filter
  const { data: rvmUnits } = useQuery<RvmUnit[]>({
    queryKey: ["rvm-units"],
    queryFn: async () => {
      const res = await fetch("/api/rvm")
      if (!res.ok) throw new Error("Failed to fetch RVM units")
      return res.json()
    },
  })

  // Fetch DIM-DB list for assignment
  const { data: dimDbList } = useQuery<DimDb[]>({
    queryKey: ["dimdb-list"],
    queryFn: async () => {
      const res = await fetch("/api/dimdb?status=available")
      if (!res.ok) throw new Error("Failed to fetch DIM-DB list")
      return res.json()
    },
    enabled: assignDialogOpen,
  })

  // Assign DIM-DB mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      routerId,
      dimDbId,
    }: {
      routerId: string
      dimDbId: string | null
    }) => {
      const res = await fetch(`/api/routers/${routerId}/assign-dimdb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimDbId }),
      })
      if (!res.ok) throw new Error("Failed to assign DIM-DB")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })
      toast({
        title: "Başarılı",
        description: "DIM-DB ataması güncellendi.",
        variant: "success",
      })
      setAssignDialogOpen(false)
      setSelectedRouter(null)
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "DIM-DB ataması başarısız oldu.",
        variant: "destructive",
      })
    },
  })

  // Delete router mutation
  const deleteMutation = useMutation({
    mutationFn: async (routerId: string) => {
      const res = await fetch(`/api/routers/${routerId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete router")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      toast({
        title: "Başarılı",
        description: "Router silindi.",
        variant: "success",
      })
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Router silinemedi.",
        variant: "destructive",
      })
    },
  })

  const handleAssignDimDb = () => {
    if (!selectedRouter) return
    assignMutation.mutate({
      routerId: selectedRouter.id,
      dimDbId: selectedDimDb || null,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Router'lar"
        description="Sistemdeki tüm router'ları yönetin"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="S/N, IMEI, MAC, SSID ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={dimDbStatus} onValueChange={setDimDbStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="DIM-DB Durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="assigned">Atanmış</SelectItem>
                <SelectItem value="unassigned">Atanmamış</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rvmFilter} onValueChange={setRvmFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="RVM Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm RVM'ler</SelectItem>
                {rvmUnits?.map((rvm) => (
                  <SelectItem key={rvm.id} value={rvm.id}>
                    {rvm.rvmId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Box No</TableHead>
                <TableHead>Seri No</TableHead>
                <TableHead>MAC</TableHead>
                <TableHead>SSID</TableHead>
                <TableHead>WiFi Şifre</TableHead>
                <TableHead>Panel Şifre</TableHead>
                <TableHead>RVM</TableHead>
                <TableHead>DIM-DB</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : routersData?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-[var(--muted-foreground)]"
                  >
                    Router bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                routersData?.data.map((router) => (
                  <TableRow key={router.id}>
                    <TableCell>
                      <div className="font-medium">{router.boxNo}</div>
                      {router.boxNoPrefix && (
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {router.boxNoPrefix}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">
                          {router.serialNumber}
                        </span>
                        <CopyButton value={router.serialNumber} label="Seri No" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">
                          {formatMacAddress(router.macAddress)}
                        </span>
                        <CopyButton value={router.macAddress} label="MAC" />
                      </div>
                    </TableCell>
                    <TableCell>{router.ssid || "-"}</TableCell>
                    <TableCell>
                      {router.wifiPassword ? (
                        <PasswordField
                          value={router.wifiPassword}
                          label="WiFi Şifre"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {router.devicePassword ? (
                        <PasswordField
                          value={router.devicePassword}
                          label="Panel Şifre"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {router.rvmUnit ? (
                        <Badge variant="secondary">{router.rvmUnit.rvmId}</Badge>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {router.dimDb ? (
                        <Badge variant="success">{router.dimDb.dimDbCode}</Badge>
                      ) : (
                        <Badge variant="warning">Atanmamış</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href="http://192.168.53.10"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Panel Aç
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRouter(router)
                              setSelectedDimDb(router.dimDbId || "")
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detay Görüntüle
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRouter(router)
                                  setSelectedDimDb(router.dimDbId || "")
                                  setAssignDialogOpen(true)
                                }}
                              >
                                <Database className="mr-2 h-4 w-4" />
                                DIM-DB Ata
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[var(--destructive)]"
                                onClick={() => {
                                  if (
                                    confirm("Bu router'ı silmek istediğinize emin misiniz?")
                                  ) {
                                    deleteMutation.mutate(router.id)
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {routersData && routersData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Toplam {routersData.pagination.total} router
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === routersData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Router Detail Dialog */}
      <Dialog
        open={!!selectedRouter && !assignDialogOpen}
        onOpenChange={(open) => !open && setSelectedRouter(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Router Detayı</DialogTitle>
            <DialogDescription>
              {selectedRouter?.boxNo} - {selectedRouter?.serialNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedRouter && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">Box No</p>
                  <p className="font-medium">{selectedRouter.boxNo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Box Prefix
                  </p>
                  <p className="font-medium">
                    {selectedRouter.boxNoPrefix || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">Seri No</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{selectedRouter.serialNumber}</span>
                    <CopyButton
                      value={selectedRouter.serialNumber}
                      label="Seri No"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">IMEI</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{selectedRouter.imei}</span>
                    <CopyButton value={selectedRouter.imei} label="IMEI" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">MAC</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {formatMacAddress(selectedRouter.macAddress)}
                    </span>
                    <CopyButton value={selectedRouter.macAddress} label="MAC" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--muted-foreground)]">Firmware</p>
                  <p className="font-medium">
                    {selectedRouter.firmware || "-"}
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <h4 className="font-semibold mb-3">Bağlantı Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--muted-foreground)]">SSID</p>
                    <div className="flex items-center gap-2">
                      <span>{selectedRouter.ssid || "-"}</span>
                      {selectedRouter.ssid && (
                        <CopyButton value={selectedRouter.ssid} label="SSID" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      WiFi Şifre
                    </p>
                    {selectedRouter.wifiPassword ? (
                      <PasswordField
                        value={selectedRouter.wifiPassword}
                        label="WiFi Şifre"
                      />
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Panel Şifre
                    </p>
                    {selectedRouter.devicePassword ? (
                      <PasswordField
                        value={selectedRouter.devicePassword}
                        label="Panel Şifre"
                      />
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Panel Erişim
                    </p>
                    <a
                      href="http://192.168.53.10"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      192.168.53.10
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign DIM-DB Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DIM-DB Ata</DialogTitle>
            <DialogDescription>
              {selectedRouter?.boxNo} ({selectedRouter?.serialNumber}) için DIM-DB seçin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={selectedDimDb} onValueChange={setSelectedDimDb}>
              <SelectTrigger>
                <SelectValue placeholder="DIM-DB seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Atamayı Kaldır</SelectItem>
                {dimDbList?.map((dimDb) => (
                  <SelectItem key={dimDb.id} value={dimDb.id}>
                    {dimDb.dimDbCode}
                    {dimDb.description && ` - ${dimDb.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleAssignDimDb}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

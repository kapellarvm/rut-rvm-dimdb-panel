"use client"

import { useState } from "react"
import Image from "next/image"
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
  Wifi,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { WifiQrDialog } from "@/components/shared/wifi-qr-dialog"
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
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "OPERATOR"

  const [search, setSearch] = useState("")
  const [dimDbStatus, setDimDbStatus] = useState("all")
  const [rvmStatus, setRvmStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedRouter, setSelectedRouter] = useState<(Router & { rvmUnit?: RvmUnit | null; dimDb?: DimDb | null }) | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDimDb, setSelectedDimDb] = useState<string>("")

  // Quick assign state
  const [editRvmId, setEditRvmId] = useState("")
  const [editDimDbCode, setEditDimDbCode] = useState("")

  // Panel password edit state
  const [editDevicePassword, setEditDevicePassword] = useState("")
  const [editWifiPassword, setEditWifiPassword] = useState("")

  // WiFi QR dialog state
  const [wifiQrDialogOpen, setWifiQrDialogOpen] = useState(false)
  const [wifiQrRouter, setWifiQrRouter] = useState<{ ssid: string; password: string; name: string } | null>(null)

  // Fetch routers
  const { data: routersData, isLoading } = useQuery<RoutersResponse>({
    queryKey: ["routers", search, dimDbStatus, rvmStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        search,
        dimDbStatus: dimDbStatus !== "all" ? dimDbStatus : "",
        rvmStatus: rvmStatus !== "all" ? rvmStatus : "",
      })
      const res = await fetch(`/api/routers?${params}`)
      if (!res.ok) throw new Error("Failed to fetch routers")
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

  // Quick assign mutation
  const quickAssignMutation = useMutation({
    mutationFn: async ({
      routerId,
      rvmId,
      dimDbCode,
    }: {
      routerId: string
      rvmId: string
      dimDbCode: string
    }) => {
      const res = await fetch(`/api/routers/${routerId}/quick-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvmId, dimDbCode }),
      })
      if (!res.ok) throw new Error("Failed to quick assign")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })

      const messages: string[] = []
      if (data.created?.rvm) {
        messages.push(`RVM "${data.created.rvm}" oluşturuldu`)
      }
      if (data.created?.dimDb) {
        messages.push(`DIM-DB "${data.created.dimDb}" oluşturuldu`)
      }

      toast({
        title: "Başarılı",
        description: messages.length > 0
          ? `Atama yapıldı. ${messages.join(", ")}.`
          : "Atama güncellendi.",
        variant: "success",
      })
      setDetailDialogOpen(false)
      setSelectedRouter(null)
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Atama başarısız oldu.",
        variant: "destructive",
      })
    },
  })

  // Update router passwords mutation
  const updatePasswordsMutation = useMutation({
    mutationFn: async ({
      routerId,
      devicePassword,
      wifiPassword,
    }: {
      routerId: string
      devicePassword?: string
      wifiPassword?: string
    }) => {
      const res = await fetch(`/api/routers/${routerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(devicePassword && { devicePassword }),
          ...(wifiPassword && { wifiPassword }),
        }),
      })
      if (!res.ok) throw new Error("Failed to update passwords")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      toast({
        title: "Başarılı",
        description: "Şifreler güncellendi.",
        variant: "success",
      })
      setDetailDialogOpen(false)
      setSelectedRouter(null)
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Şifreler güncellenemedi.",
        variant: "destructive",
      })
    },
  })

  const handleAssignDimDb = () => {
    if (!selectedRouter) return
    assignMutation.mutate({
      routerId: selectedRouter.id,
      dimDbId: selectedDimDb === "__unassign__" ? null : selectedDimDb || null,
    })
  }

  const handleQuickAssign = () => {
    if (!selectedRouter) return
    quickAssignMutation.mutate({
      routerId: selectedRouter.id,
      rvmId: editRvmId,
      dimDbCode: editDimDbCode,
    })
  }

  const handleUpdatePasswords = () => {
    if (!selectedRouter) return
    if (!editDevicePassword && !editWifiPassword) {
      toast({
        title: "Uyarı",
        description: "En az bir şifre alanı doldurulmalı.",
        variant: "destructive",
      })
      return
    }
    updatePasswordsMutation.mutate({
      routerId: selectedRouter.id,
      devicePassword: editDevicePassword || undefined,
      wifiPassword: editWifiPassword || undefined,
    })
  }

  const openDetailDialog = (router: Router & { rvmUnit?: RvmUnit | null; dimDb?: DimDb | null }) => {
    setSelectedRouter(router)
    setEditRvmId(router.rvmUnit?.rvmId || "")
    setEditDimDbCode(router.dimDb?.dimDbCode || "")
    setEditDevicePassword("")
    setEditWifiPassword("")
    setDetailDialogOpen(true)
  }

  const openWifiQrDialog = (router: Router) => {
    if (!router.ssid || !router.wifiPassword) {
      toast({
        title: "Uyarı",
        description: "Bu router için SSID veya WiFi şifresi tanımlı değil.",
        variant: "destructive",
      })
      return
    }
    setWifiQrRouter({
      ssid: router.ssid,
      password: router.wifiPassword,
      name: router.boxNo,
    })
    setWifiQrDialogOpen(true)
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
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={rvmStatus} onValueChange={setRvmStatus}>
              <SelectTrigger className="w-full xs:w-[130px]">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="RVM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">RVM: Tümü</SelectItem>
                <SelectItem value="assigned">RVM: Var</SelectItem>
                <SelectItem value="unassigned">RVM: Yok</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dimDbStatus} onValueChange={setDimDbStatus}>
              <SelectTrigger className="w-full xs:w-[140px]">
                <SelectValue placeholder="DIM-DB" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">DIM-DB: Tümü</SelectItem>
                <SelectItem value="assigned">DIM-DB: Var</SelectItem>
                <SelectItem value="unassigned">DIM-DB: Yok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))
        ) : routersData?.data.length === 0 ? (
          <Card className="p-8 text-center text-[var(--muted-foreground)]">
            Router bulunamadı
          </Card>
        ) : (
          routersData?.data.map((router) => (
            <Card
              key={router.id}
              className="p-4 cursor-pointer hover-lift touch-feedback active:scale-[0.98]"
              onClick={() => openDetailDialog(router)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-medium text-sm">{router.serialNumber}</span>
                    <div className="flex gap-1">
                      {router.dimDb ? (
                        <Badge variant="success" className="text-xs">DIM-DB</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">Bekliyor</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    {router.ssid && (
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        {router.ssid}
                      </span>
                    )}
                    {router.rvmUnit && (
                      <Badge variant="secondary" className="text-xs">{router.rvmUnit.rvmId}</Badge>
                    )}
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="touch-target">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href="http://192.168.53.10" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Panel Aç
                        </a>
                      </DropdownMenuItem>
                      {router.ssid && router.wifiPassword && (
                        <DropdownMenuItem onClick={() => openWifiQrDialog(router)}>
                          <Wifi className="mr-2 h-4 w-4" />
                          WiFi QR Kodu
                        </DropdownMenuItem>
                      )}
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
                              if (confirm("Bu router'ı silmek istediğinize emin misiniz?")) {
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
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Mobile Pagination */}
        {routersData && routersData.pagination.totalPages > 1 && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {page}/{routersData.pagination.totalPages} ({routersData.pagination.total} router)
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 h-11"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11"
                disabled={page === routersData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Seri No</TableHead>
                <TableHead>SSID</TableHead>
                <TableHead>WiFi</TableHead>
                <TableHead>Panel</TableHead>
                <TableHead>RVM</TableHead>
                <TableHead>DIM-DB</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : routersData?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-[var(--muted-foreground)]"
                  >
                    Router bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                routersData?.data.map((router) => (
                  <TableRow
                    key={router.id}
                    className="text-xs cursor-pointer hover:bg-[var(--accent)]/50 transition-colors active:bg-[var(--accent)]"
                    onClick={() => openDetailDialog(router)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">
                          {router.serialNumber}
                        </span>
                        <CopyButton value={router.serialNumber} label="S/N" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">{router.ssid || "-"}</TableCell>
                    <TableCell>
                      {router.wifiPassword ? (
                        <PasswordField
                          value={router.wifiPassword}
                          label="WiFi"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {router.devicePassword ? (
                        <PasswordField
                          value={router.devicePassword}
                          label="Panel"
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {router.rvmUnit ? (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{router.rvmUnit.rvmId}</Badge>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {router.dimDb ? (
                        <Badge variant="success" className="text-xs px-1.5 py-0.5">Var</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs px-1.5 py-0.5">Yok</Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                            onClick={() => openDetailDialog(router)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Detay Görüntüle
                          </DropdownMenuItem>
                          {router.ssid && router.wifiPassword && (
                            <DropdownMenuItem
                              onClick={() => openWifiQrDialog(router)}
                            >
                              <Wifi className="mr-2 h-4 w-4" />
                              WiFi QR Kodu
                            </DropdownMenuItem>
                          )}
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

        {/* Desktop Pagination */}
        {routersData && routersData.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
            <p className="text-sm text-[var(--muted-foreground)] text-center sm:text-left">
              Toplam {routersData.pagination.total} router ({page}/{routersData.pagination.totalPages})
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
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) setSelectedRouter(null)
        }}
      >
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Router Detayı</DialogTitle>
            <DialogDescription>
              {selectedRouter?.boxNo} - {selectedRouter?.serialNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedRouter && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* WiFi QR Button */}
                {selectedRouter.ssid && selectedRouter.wifiPassword && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => openWifiQrDialog(selectedRouter)}
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    WiFi QR Kodu Oluştur
                  </Button>
                )}
              </div>

              {/* RVM & DIM-DB Assignment */}
              {isAdmin && (
                <div className="border-t border-[var(--border)] pt-4">
                  <h4 className="font-semibold mb-3">RVM & DIM-DB Atama</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--muted-foreground)] flex items-center gap-2">
                        <Image
                          src="/icons/rvm.png"
                          alt="RVM"
                          width={28}
                          height={28}
                          className="object-contain"
                        />
                        RVM ID
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Image
                            src="/icons/rvm.png"
                            alt="RVM"
                            width={24}
                            height={24}
                            className="object-contain opacity-70"
                          />
                        </div>
                        <Input
                          value={editRvmId}
                          onChange={(e) => setEditRvmId(e.target.value)}
                          placeholder="Örn: KPL0402511010"
                          className="pl-12"
                        />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Yoksa otomatik oluşturulur
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--muted-foreground)] flex items-center gap-2">
                        <Image
                          src="/icons/dim-db2.png"
                          alt="DIM-DB"
                          width={28}
                          height={28}
                          className="object-contain"
                        />
                        DIM-DB Kodu
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Image
                            src="/icons/dim-db2.png"
                            alt="DIM-DB"
                            width={24}
                            height={24}
                            className="object-contain opacity-70"
                          />
                        </div>
                        <Input
                          value={editDimDbCode}
                          onChange={(e) => setEditDimDbCode(e.target.value)}
                          placeholder="Örn: DIMDB-2024-001"
                          className="pl-12"
                        />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Yoksa otomatik oluşturulur
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleQuickAssign}
                      disabled={quickAssignMutation.isPending}
                    >
                      {quickAssignMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Password Update */}
              {isAdmin && (
                <div className="border-t border-[var(--border)] pt-4">
                  <h4 className="font-semibold mb-3">Şifre Güncelleme</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="devicePassword">Panel Şifresi</Label>
                      <Input
                        id="devicePassword"
                        value={editDevicePassword}
                        onChange={(e) => setEditDevicePassword(e.target.value)}
                        placeholder="Yeni panel şifresi"
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Router yönetim paneli şifresi
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wifiPassword">WiFi Şifresi</Label>
                      <Input
                        id="wifiPassword"
                        value={editWifiPassword}
                        onChange={(e) => setEditWifiPassword(e.target.value)}
                        placeholder="Yeni WiFi şifresi"
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Kablosuz ağ şifresi
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleUpdatePasswords}
                      disabled={updatePasswordsMutation.isPending || (!editDevicePassword && !editWifiPassword)}
                    >
                      {updatePasswordsMutation.isPending ? "Güncelleniyor..." : "Şifreleri Güncelle"}
                    </Button>
                  </div>
                </div>
              )}
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
                <SelectItem value="__unassign__">Atamayı Kaldır</SelectItem>
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

      {/* WiFi QR Dialog */}
      {wifiQrRouter && (
        <WifiQrDialog
          open={wifiQrDialogOpen}
          onOpenChange={(open) => {
            setWifiQrDialogOpen(open)
            if (!open) setWifiQrRouter(null)
          }}
          ssid={wifiQrRouter.ssid}
          password={wifiQrRouter.password}
          routerName={wifiQrRouter.name}
        />
      )}
    </div>
  )
}

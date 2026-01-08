"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Search,
  Plus,
  MoreHorizontal,
  Router,
  MapPin,
  Trash2,
  Edit,
  Filter,
  X,
  Database,
  Download,
  Wifi,
  QrCode,
  Link2,
  ChevronLeft,
  ChevronRight,
  Server,
  Smartphone,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PasswordField } from "@/components/shared/password-field"
import { CopyButton } from "@/components/shared/copy-button"
import { WifiQrDialog } from "@/components/shared/wifi-qr-dialog"
import { RefreshButton } from "@/components/shared/refresh-button"
import { toast } from "@/hooks/use-toast"
import { clearApiCache } from "@/lib/cache-utils"
import { formatMacAddress, formatMonth, parseRvmId } from "@/lib/utils"
import type { RvmUnit, Router as RouterType, DimDb, SimCard } from "@/types"
import * as XLSX from "xlsx"

interface RvmWithRouters extends RvmUnit {
  routers: (RouterType & { dimDb: DimDb | null; simCard: SimCard | null })[]
  _count: { routers: number }
}

interface RvmFilters {
  machineClasses: string[]
  years: string[]
  months: string[]
}

export default function RvmPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "OPERATOR"

  const [search, setSearch] = useState("")
  const [machineClass, setMachineClass] = useState("")
  const [year, setYear] = useState("")
  const [month, setMonth] = useState("")
  const [dimDbStatus, setDimDbStatus] = useState("")
  const [simCardStatus, setSimCardStatus] = useState("")
  const [selectedRvm, setSelectedRvm] = useState<RvmWithRouters | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRvm, setEditingRvm] = useState<RvmWithRouters | null>(null)
  const [newRvmId, setNewRvmId] = useState("")
  const [newRvmName, setNewRvmName] = useState("")
  const [newRvmLocation, setNewRvmLocation] = useState("")
  const [editRvmName, setEditRvmName] = useState("")
  const [editRvmLocation, setEditRvmLocation] = useState("")

  // WiFi QR dialog state
  const [wifiQrDialogOpen, setWifiQrDialogOpen] = useState(false)
  const [wifiQrRouter, setWifiQrRouter] = useState<{ ssid: string; password: string; name: string } | null>(null)

  // Quick assign state for routers in RVM detail
  const [assigningRouterId, setAssigningRouterId] = useState<string | null>(null)
  const [assignDimDbCode, setAssignDimDbCode] = useState("")
  const [assignSimCardPhone, setAssignSimCardPhone] = useState("")

  // Router assign state
  const [routerAssignDialogOpen, setRouterAssignDialogOpen] = useState(false)
  const [newRouterSerialNumber, setNewRouterSerialNumber] = useState("")

  // Edit router state
  const [editRouterSerialNumber, setEditRouterSerialNumber] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch filter options
  const { data: filterOptions } = useQuery<RvmFilters>({
    queryKey: ["rvm-filters"],
    queryFn: async () => {
      const res = await fetch("/api/rvm/filters")
      if (!res.ok) throw new Error("Failed to fetch filter options")
      return res.json()
    },
  })

  // Normalize filter values (convert __all__ to empty string for API)
  const effectiveMachineClass = machineClass === "__all__" ? "" : machineClass
  const effectiveYear = year === "__all__" ? "" : year
  const effectiveMonth = month === "__all__" ? "" : month

  // Fetch RVM units
  const { data: rvmUnits, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery<RvmWithRouters[]>({
    queryKey: ["rvm-units", search, effectiveMachineClass, effectiveYear, effectiveMonth],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        includeRouters: "true",
        machineClass: effectiveMachineClass,
        year: effectiveYear,
        month: effectiveMonth,
      })
      const res = await fetch(`/api/rvm?${params}`)
      if (!res.ok) throw new Error("Failed to fetch RVM units")
      return res.json()
    },
  })

  const hasActiveFilters = effectiveMachineClass || effectiveYear || effectiveMonth || dimDbStatus || simCardStatus

  // Keep selectedRvm in sync with latest data from query
  useEffect(() => {
    if (selectedRvm && rvmUnits) {
      const updatedRvm = rvmUnits.find((rvm) => rvm.id === selectedRvm.id)
      if (updatedRvm && JSON.stringify(updatedRvm) !== JSON.stringify(selectedRvm)) {
        setSelectedRvm(updatedRvm)
      }
    }
  }, [rvmUnits, selectedRvm])

  const clearFilters = () => {
    setMachineClass("")
    setYear("")
    setMonth("")
    setDimDbStatus("")
    setSimCardStatus("")
    setCurrentPage(1)
  }

  // Filter RVM units by DIM-DB and SIM card status (client-side)
  const filteredRvmUnits = rvmUnits?.filter((rvm) => {
    // DIM-DB filter
    if (dimDbStatus) {
      const hasUnassignedDimDb = rvm.routers.some((r) => !r.dimDb)

      if (dimDbStatus === "unassigned" && !hasUnassignedDimDb) {
        return false
      }
      if (dimDbStatus === "assigned" && (rvm.routers.length === 0 || hasUnassignedDimDb)) {
        return false
      }
    }

    // SIM card filter
    if (simCardStatus) {
      const hasUnassignedSim = rvm.routers.some((r) => !r.simCard)

      if (simCardStatus === "unassigned" && !hasUnassignedSim) {
        return false
      }
      if (simCardStatus === "assigned" && (rvm.routers.length === 0 || hasUnassignedSim)) {
        return false
      }
    }

    return true
  })

  // Pagination logic
  const totalItems = filteredRvmUnits?.length || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRvmUnits = filteredRvmUnits?.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1)

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
    onSuccess: async () => {
      await clearApiCache()
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
    onSuccess: async () => {
      await clearApiCache()
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

  // Edit RVM mutation
  const editMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; location?: string }) => {
      const res = await fetch(`/api/rvm/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, location: data.location }),
      })
      if (!res.ok) throw new Error("Failed to update RVM")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["rvm-filters"] })
      toast({
        title: "Başarılı",
        description: "RVM birimi güncellendi.",
        variant: "success",
      })
      setEditDialogOpen(false)
      setEditingRvm(null)
      setEditRvmName("")
      setEditRvmLocation("")
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "RVM birimi güncellenemedi.",
        variant: "destructive",
      })
    },
  })

  // Quick assign DIM-DB and SIM Card to router mutation
  const quickAssignMutation = useMutation({
    mutationFn: async ({ routerId, dimDbCode, simCardPhone }: { routerId: string; dimDbCode?: string; simCardPhone?: string }) => {
      const res = await fetch(`/api/routers/${routerId}/quick-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimDbCode, simCardPhone }),
      })
      if (!res.ok) throw new Error("Failed to assign")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })
      queryClient.invalidateQueries({ queryKey: ["simcard-list"] })
      toast({
        title: "Başarılı",
        description: "Atama yapıldı.",
        variant: "success",
      })
      setAssigningRouterId(null)
      setAssignDimDbCode("")
      setAssignSimCardPhone("")
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Atama başarısız oldu.",
        variant: "destructive",
      })
    },
  })

  // Assign router to RVM mutation
  const assignRouterMutation = useMutation({
    mutationFn: async ({ rvmId, serialNumber }: { rvmId: string; serialNumber: string }) => {
      const res = await fetch(`/api/rvm/${rvmId}/assign-router`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to assign router")
      }
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      toast({
        title: "Başarılı",
        description: "Router bu RVM'e atandı.",
        variant: "success",
      })
      setRouterAssignDialogOpen(false)
      setNewRouterSerialNumber("")
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Router ataması başarısız oldu.",
        variant: "destructive",
      })
    },
  })

  // Remove router from RVM mutation
  const removeRouterMutation = useMutation({
    mutationFn: async (routerId: string) => {
      const res = await fetch(`/api/routers/${routerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvmUnitId: null }),
      })
      if (!res.ok) throw new Error("Failed to remove router")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      toast({
        title: "Başarılı",
        description: "Router bu RVM'den kaldırıldı.",
        variant: "success",
      })
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Router kaldırılamadı.",
        variant: "destructive",
      })
    },
  })

  // Change router mutation (remove old, assign new)
  const changeRouterMutation = useMutation({
    mutationFn: async ({ rvmId, oldRouterId, newSerialNumber }: { rvmId: string; oldRouterId: string; newSerialNumber: string }) => {
      // First remove old router
      await fetch(`/api/routers/${oldRouterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvmUnitId: null }),
      })
      // Then assign new router
      const res = await fetch(`/api/rvm/${rvmId}/assign-router`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber: newSerialNumber }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to change router")
      }
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      toast({
        title: "Başarılı",
        description: "Router değiştirildi.",
        variant: "success",
      })
      setEditDialogOpen(false)
      setEditingRvm(null)
      setEditRouterSerialNumber("")
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Router değiştirilemedi.",
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

  const openEditDialog = (rvm: RvmWithRouters) => {
    setEditingRvm(rvm)
    setEditRvmName(rvm.name || "")
    setEditRvmLocation(rvm.location || "")
    setEditDialogOpen(true)
  }

  const handleEdit = () => {
    if (!editingRvm) return
    editMutation.mutate({
      id: editingRvm.id,
      name: editRvmName || undefined,
      location: editRvmLocation || undefined,
    })
  }

  const openWifiQrDialog = (router: RouterType) => {
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

  const handleExport = () => {
    if (!filteredRvmUnits || filteredRvmUnits.length === 0) {
      toast({
        title: "Uyarı",
        description: "Dışa aktarılacak veri bulunamadı.",
        variant: "destructive",
      })
      return
    }

    // Prepare data for export
    const exportData: Record<string, unknown>[] = []

    filteredRvmUnits.forEach((rvm) => {
      if (rvm.routers.length === 0) {
        // RVM without routers
        exportData.push({
          "RVM ID": rvm.rvmId,
          "RVM Adı": rvm.name || "",
          "Konum": rvm.location || "",
          "Router Box No": "",
          "Seri No": "",
          "IMEI": "",
          "MAC Adresi": "",
          "SSID": "",
          "WiFi Şifre": "",
          "Panel Şifre": "",
          "DIM-DB Kodu": "",
        })
      } else {
        // RVM with routers
        rvm.routers.forEach((router) => {
          exportData.push({
            "RVM ID": rvm.rvmId,
            "RVM Adı": rvm.name || "",
            "Konum": rvm.location || "",
            "Router Box No": router.boxNo,
            "Seri No": router.serialNumber,
            "IMEI": router.imei,
            "MAC Adresi": router.macAddress,
            "SSID": router.ssid || "",
            "WiFi Şifre": router.wifiPassword || "",
            "Panel Şifre": router.devicePassword || "",
            "DIM-DB Kodu": router.dimDb?.dimDbCode || "",
          })
        })
      }
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // RVM ID
      { wch: 20 }, // RVM Adı
      { wch: 15 }, // Konum
      { wch: 12 }, // Router Box No
      { wch: 15 }, // Seri No
      { wch: 18 }, // IMEI
      { wch: 18 }, // MAC Adresi
      { wch: 15 }, // SSID
      { wch: 15 }, // WiFi Şifre
      { wch: 15 }, // Panel Şifre
      { wch: 20 }, // DIM-DB Kodu
    ]

    XLSX.utils.book_append_sheet(wb, ws, "RVM Verileri")

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0]
    const filename = `RVM_Export_${date}.xlsx`

    // Download
    XLSX.writeFile(wb, filename)

    toast({
      title: "Başarılı",
      description: `${exportData.length} satır dışa aktarıldı.`,
      variant: "success",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="RVM Birimleri"
        description="RVM birimlerini ve bağlı router'ları görüntüleyin"
      >
        <div className="flex gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isLoading={isLoading}
            isFetching={isFetching}
            dataUpdatedAt={dataUpdatedAt}
          />
          <Button variant="outline" onClick={handleExport} disabled={!filteredRvmUnits || filteredRvmUnits.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Excel Export
          </Button>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni RVM
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="RVM ID, isim veya konum ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Smart Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Filter className="h-4 w-4" />
              <span>Akıllı Filtreler:</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
              <Select value={machineClass} onValueChange={setMachineClass}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Makine Sınıfı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm Sınıflar</SelectItem>
                  {filterOptions?.machineClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Sınıf {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Yıl" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm Yıllar</SelectItem>
                  {filterOptions?.years.map((y) => (
                    <SelectItem key={y} value={y}>
                      20{y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Ay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tüm Aylar</SelectItem>
                  {filterOptions?.months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonth(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dimDbStatus} onValueChange={setDimDbStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="DIM-DB Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tümü</SelectItem>
                  <SelectItem value="unassigned">DIM-DB Eksik</SelectItem>
                  <SelectItem value="assigned">DIM-DB Tam</SelectItem>
                </SelectContent>
              </Select>

              <Select value={simCardStatus} onValueChange={setSimCardStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="SIM Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tümü</SelectItem>
                  <SelectItem value="unassigned">SIM Eksik</SelectItem>
                  <SelectItem value="assigned">SIM Tam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Filtreleri Temizle
              </Button>
            )}
          </div>

          {/* Active filters info */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted-foreground)]">Aktif filtreler:</span>
              {effectiveMachineClass && (
                <Badge variant="secondary">Sınıf: {effectiveMachineClass}</Badge>
              )}
              {effectiveYear && (
                <Badge variant="secondary">Yıl: 20{effectiveYear}</Badge>
              )}
              {effectiveMonth && (
                <Badge variant="secondary">Ay: {formatMonth(effectiveMonth)}</Badge>
              )}
              {dimDbStatus && (
                <Badge variant={dimDbStatus === "unassigned" ? "warning" : "success"}>
                  {dimDbStatus === "unassigned" ? "DIM-DB Eksik" : "DIM-DB Tam"}
                </Badge>
              )}
              {simCardStatus && (
                <Badge variant={simCardStatus === "unassigned" ? "outline" : "success"}>
                  {simCardStatus === "unassigned" ? "SIM Eksik" : "SIM Tam"}
                </Badge>
              )}
            </div>
          )}
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
        ) : paginatedRvmUnits?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
            RVM birimi bulunamadı
          </div>
        ) : (
          paginatedRvmUnits?.map((rvm) => (
            <Card
              key={rvm.id}
              className="hover-lift cursor-pointer"
              onClick={() => setSelectedRvm(rvm)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center p-1">
                    <Image
                      src="/icons/rvm.png"
                      alt="RVM"
                      width={36}
                      height={36}
                      className="object-contain"
                    />
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
                          openEditDialog(rvm)
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
                {/* Parsed RVM ID Info */}
                {(() => {
                  const parsed = parseRvmId(rvm.rvmId)
                  if (parsed.isValid) {
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                        <Badge variant="outline" className="font-normal">
                          Sınıf: {parsed.machineClass}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          20{parsed.year}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {formatMonth(parsed.month)}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          #{parsed.order}
                        </Badge>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Router className="h-4 w-4" />
                    <span>{rvm._count.routers} Router</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Database className="h-4 w-4" />
                    <span>{rvm.routers.filter((r) => r.dimDb).length} DIM-DB</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Smartphone className="h-4 w-4" />
                    <span>{rvm.routers.filter((r) => r.simCard).length} SIM</span>
                  </div>
                  {rvm.location && (
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <MapPin className="h-4 w-4" />
                      <span>{rvm.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {rvm.routers.filter((r) => r.dimDb).length === rvm._count.routers && rvm._count.routers > 0 ? (
                    <Badge variant="success">DIM-DB atandı</Badge>
                  ) : rvm.routers.filter((r) => !r.dimDb).length > 0 && (
                    <Badge variant="warning">
                      {rvm.routers.filter((r) => !r.dimDb).length} DIM-DB bekliyor
                    </Badge>
                  )}
                  {rvm.routers.filter((r) => r.simCard).length === rvm._count.routers && rvm._count.routers > 0 ? (
                    <Badge variant="success">SIM atandı</Badge>
                  ) : rvm.routers.filter((r) => !r.simCard).length > 0 && (
                    <Badge variant="outline">
                      {rvm.routers.filter((r) => !r.simCard).length} SIM bekliyor
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[var(--muted-foreground)]">
              Toplam {totalItems} RVM birimi ({startIndex + 1}-{Math.min(endIndex, totalItems)} arası gösteriliyor)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                İlk
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Son
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* RVM Detail Dialog */}
      <Dialog
        open={!!selectedRvm}
        onOpenChange={(open) => !open && setSelectedRvm(null)}
      >
        <DialogContent className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              {selectedRvm?.rvmId}
            </DialogTitle>
            <DialogDescription>
              {selectedRvm?.name || "RVM Birimi"}
              {selectedRvm?.location && ` - ${selectedRvm.location}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRvm && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="p-4 bg-[var(--secondary)]/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Router className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedRvm._count.routers}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Router</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-[var(--secondary)]/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedRvm.routers.filter((r) => r.dimDb).length}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">DIM-DB Atanmış</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-[var(--secondary)]/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedRvm.routers.filter((r) => !r.dimDb).length}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Bekleyen</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* DIM-DB List */}
              {selectedRvm.routers.filter((r) => r.dimDb).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-500" />
                    Bağlı DIM-DB&apos;ler
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRvm.routers
                      .filter((r) => r.dimDb)
                      .map((router) => (
                        <Card key={router.id} className="p-3 bg-green-500/5 border-green-500/20">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="font-mono text-sm">{router.dimDb!.dimDbCode}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{router.boxNo}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Router className="h-4 w-4 text-blue-500" />
                    Bağlı Router&apos;lar
                  </h4>
                  {/* Router Ata butonu sadece router yoksa göster */}
                  {isAdmin && selectedRvm.routers.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRouterAssignDialogOpen(true)}
                      className="gap-2"
                    >
                      <Link2 className="h-4 w-4" />
                      Router Ata
                    </Button>
                  )}
                </div>
                {selectedRvm.routers.length === 0 ? (
                  <p className="text-[var(--muted-foreground)]">
                    Bu RVM&apos;e bağlı router yok
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedRvm.routers.map((router) => (
                      <Card key={router.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{router.boxNo}</span>
                              {router.dimDb ? (
                                <Badge variant="success" className="flex items-center gap-1.5 py-1">
                                  <Image
                                    src="/icons/dim-db2.png"
                                    alt="DIM-DB"
                                    width={18}
                                    height={18}
                                    className="object-contain"
                                  />
                                  {router.dimDb.dimDbCode}
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="flex items-center gap-1.5 py-1">
                                  <Image
                                    src="/icons/dim-db2.png"
                                    alt="DIM-DB"
                                    width={18}
                                    height={18}
                                    className="object-contain opacity-70"
                                  />
                                  DIM-DB Yok
                                </Badge>
                              )}
                              {router.simCard ? (
                                <Badge variant="success" className="flex items-center gap-1 py-1">
                                  <span className="text-sm">📱</span>
                                  {router.simCard.phoneNumber}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 py-1 opacity-60">
                                  <span className="text-sm">📱</span>
                                  SIM Yok
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
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
                                  SSID:
                                </span>
                                <span className="font-mono">
                                  {router.ssid || "-"}
                                </span>
                                {router.ssid && (
                                  <CopyButton
                                    value={router.ssid}
                                    label="SSID"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--muted-foreground)]">
                                  WiFi Şifre:
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

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {router.ssid && router.wifiPassword && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openWifiQrDialog(router)}
                                  className="gap-2"
                                >
                                  <QrCode className="h-4 w-4" />
                                  WiFi QR Kodu
                                </Button>
                              )}

                              {/* DIM-DB & SIM Card Assign/Change */}
                              {isAdmin && (
                                <>
                                  {assigningRouterId === router.id ? (
                                    <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
                                      <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                            <Image
                                              src="/icons/dim-db2.png"
                                              alt="DIM-DB"
                                              width={20}
                                              height={20}
                                              className="object-contain opacity-70"
                                            />
                                          </div>
                                          <Input
                                            value={assignDimDbCode}
                                            onChange={(e) => setAssignDimDbCode(e.target.value)}
                                            placeholder="DIM-DB Kodu"
                                            className="h-8 pl-9 text-sm"
                                          />
                                        </div>
                                        <div className="relative flex-1">
                                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--muted-foreground)]">
                                            +90
                                          </div>
                                          <Input
                                            value={assignSimCardPhone}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                                              setAssignSimCardPhone(val)
                                            }}
                                            placeholder="5XX XXX XX XX"
                                            className="h-8 pl-10 text-sm"
                                            maxLength={10}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="h-7 flex-1"
                                          onClick={() => {
                                            if (assignDimDbCode || assignSimCardPhone) {
                                              quickAssignMutation.mutate({
                                                routerId: router.id,
                                                dimDbCode: assignDimDbCode || undefined,
                                                simCardPhone: assignSimCardPhone || undefined,
                                              })
                                            }
                                          }}
                                          disabled={(!assignDimDbCode && !assignSimCardPhone) || quickAssignMutation.isPending}
                                        >
                                          {quickAssignMutation.isPending ? "..." : "Kaydet"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7"
                                          onClick={() => {
                                            setAssigningRouterId(null)
                                            setAssignDimDbCode("")
                                            setAssignSimCardPhone("")
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setAssigningRouterId(router.id)
                                        setAssignDimDbCode(router.dimDb?.dimDbCode || "")
                                        setAssignSimCardPhone(router.simCard?.phoneNumber || "")
                                      }}
                                      className="gap-2"
                                    >
                                      {(router.dimDb || router.simCard) ? (
                                        <>
                                          <Edit className="h-4 w-4" />
                                          Düzenle
                                        </>
                                      ) : (
                                        <>
                                          <Link2 className="h-4 w-4" />
                                          Ata
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </>
                              )}
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

      {/* Edit RVM Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RVM Birimi Düzenle</DialogTitle>
            <DialogDescription>
              {editingRvm?.rvmId} birimini düzenleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRvmId">RVM ID</Label>
              <Input
                id="editRvmId"
                value={editingRvm?.rvmId || ""}
                disabled
                className="bg-[var(--secondary)]"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                RVM ID değiştirilemez
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">İsim (Opsiyonel)</Label>
              <Input
                id="editName"
                placeholder="Örn: Ana Bina RVM"
                value={editRvmName}
                onChange={(e) => setEditRvmName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLocation">Konum (Opsiyonel)</Label>
              <Input
                id="editLocation"
                placeholder="Örn: İstanbul"
                value={editRvmLocation}
                onChange={(e) => setEditRvmLocation(e.target.value)}
              />
            </div>

            {/* Router Değiştirme Bölümü */}
            {editingRvm && editingRvm.routers && editingRvm.routers.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <Label className="flex items-center gap-2">
                  <Router className="h-4 w-4" />
                  Bağlı Router
                </Label>
                <div className="p-3 bg-[var(--secondary)]/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{editingRvm.routers[0].boxNo}</p>
                      <p className="text-xs text-[var(--muted-foreground)] font-mono">
                        S/N: {editingRvm.routers[0].serialNumber}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Router'ı bu RVM'den kaldırmak istediğinize emin misiniz?")) {
                          removeRouterMutation.mutate(editingRvm.routers[0].id)
                          setEditDialogOpen(false)
                        }
                      }}
                      disabled={removeRouterMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Kaldır
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRouterSerial" className="text-sm">
                    Yeni Router ile Değiştir
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="editRouterSerial"
                      placeholder="Yeni router seri numarası"
                      value={editRouterSerialNumber}
                      onChange={(e) => setEditRouterSerialNumber(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        if (editRouterSerialNumber && editingRvm) {
                          changeRouterMutation.mutate({
                            rvmId: editingRvm.id,
                            oldRouterId: editingRvm.routers[0].id,
                            newSerialNumber: editRouterSerialNumber,
                          })
                        }
                      }}
                      disabled={!editRouterSerialNumber || changeRouterMutation.isPending}
                    >
                      {changeRouterMutation.isPending ? "..." : "Değiştir"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false)
                  setEditingRvm(null)
                  setEditRvmName("")
                  setEditRvmLocation("")
                  setEditRouterSerialNumber("")
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleEdit}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
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

      {/* Router Assign Dialog */}
      <Dialog open={routerAssignDialogOpen} onOpenChange={setRouterAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Router className="h-5 w-5 text-blue-500" />
              Router Ata
            </DialogTitle>
            <DialogDescription>
              {selectedRvm?.rvmId} birimine router atayın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Router className="h-4 w-4" />
                Router Seri Numarası
              </Label>
              <Input
                placeholder="Örn: 1234567890"
                value={newRouterSerialNumber}
                onChange={(e) => setNewRouterSerialNumber(e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Sistemde kayıtlı bir router&apos;ın seri numarasını girin
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setRouterAssignDialogOpen(false)
                  setNewRouterSerialNumber("")
                }}
              >
                İptal
              </Button>
              <Button
                onClick={() => {
                  if (selectedRvm && newRouterSerialNumber) {
                    assignRouterMutation.mutate({
                      rvmId: selectedRvm.id,
                      serialNumber: newRouterSerialNumber,
                    })
                  }
                }}
                disabled={!newRouterSerialNumber || assignRouterMutation.isPending}
              >
                {assignRouterMutation.isPending ? "Atanıyor..." : "Ata"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Smartphone,
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Router,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { RefreshButton } from "@/components/shared/refresh-button"
import { CopyButton } from "@/components/shared/copy-button"
import { toast } from "@/hooks/use-toast"
import { clearApiCache } from "@/lib/cache-utils"
import type { SimCard } from "@/types"

interface SimCardWithCount extends Omit<SimCard, 'routers'> {
  _count: { routers: number }
  routers?: {
    id: string
    serialNumber: string
    rvmUnit?: {
      id: string
      rvmId: string
    } | null
  }[]
}

export default function SimCardPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "OPERATOR"

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newPhoneNumber, setNewPhoneNumber] = useState("")
  const [editingSimCard, setEditingSimCard] = useState<SimCardWithCount | null>(null)
  const [editPhoneNumber, setEditPhoneNumber] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch SIM card list
  const { data: simCardList, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery<SimCardWithCount[]>({
    queryKey: ["simcard-list", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        status: statusFilter !== "all" ? statusFilter : "",
      })
      const res = await fetch(`/api/simcard?${params}`)
      if (!res.ok) throw new Error("Failed to fetch SIM card list")
      return res.json()
    },
  })

  // Pagination logic
  const totalItems = simCardList?.length || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSimCardList = simCardList?.slice(startIndex, endIndex)

  // Create SIM card mutation
  const createMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const res = await fetch("/api/simcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create SIM card")
      }
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["simcard-list"] })
      toast({
        title: "Başarılı",
        description: "SIM kart eklendi.",
        variant: "success",
      })
      setCreateDialogOpen(false)
      setNewPhoneNumber("")
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "SIM kart eklenemedi.",
        variant: "destructive",
      })
    },
  })

  // Update SIM card mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, phoneNumber }: { id: string; phoneNumber: string }) => {
      const res = await fetch(`/api/simcard/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update SIM card")
      }
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["simcard-list"] })
      toast({
        title: "Başarılı",
        description: "SIM kart güncellendi.",
        variant: "success",
      })
      setEditDialogOpen(false)
      setEditingSimCard(null)
      setEditPhoneNumber("")
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "SIM kart güncellenemedi.",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/simcard/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete SIM card")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["simcard-list"] })
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      toast({
        title: "Başarılı",
        description: "SIM kart silindi.",
        variant: "success",
      })
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "SIM kart silinemedi.",
        variant: "destructive",
      })
    },
  })

  const openEditDialog = (simCard: SimCardWithCount) => {
    setEditingSimCard(simCard)
    setEditPhoneNumber(simCard.phoneNumber)
    setEditDialogOpen(true)
  }

  const handleCreate = () => {
    if (!newPhoneNumber || newPhoneNumber.length !== 10) return
    createMutation.mutate({ phoneNumber: newPhoneNumber })
  }

  const handleUpdate = () => {
    if (!editingSimCard || !editPhoneNumber || editPhoneNumber.length !== 10) return
    updateMutation.mutate({ id: editingSimCard.id, phoneNumber: editPhoneNumber })
  }

  const availableCount = simCardList?.filter((s) => s.status === "AVAILABLE").length || 0
  const assignedCount = simCardList?.filter((s) => s.status === "ASSIGNED").length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="SIM Kart Yönetimi"
        description="SIM kartları yönetin ve router'lara atayın"
      >
        <div className="flex gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isLoading={isLoading}
            isFetching={isFetching}
            dataUpdatedAt={dataUpdatedAt}
          />
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni SIM Kart
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Toplam</p>
              <p className="text-2xl font-bold">{simCardList?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Müsait</p>
              <p className="text-2xl font-bold">{availableCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
              <X className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Atanmış</p>
              <p className="text-2xl font-bold">{assignedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="Telefon numarası ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="available">Müsait</SelectItem>
              <SelectItem value="assigned">Atanmış</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefon Numarası</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Atanan Router</TableHead>
                <TableHead>Atanan RVM</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedSimCardList?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-[var(--muted-foreground)]"
                  >
                    SIM kart bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSimCardList?.map((simCard) => (
                  <TableRow key={simCard.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          +90 {simCard.phoneNumber}
                        </span>
                        <CopyButton value={`+90${simCard.phoneNumber}`} label="Telefon" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {simCard.status === "AVAILABLE" ? (
                        <Badge variant="success">Müsait</Badge>
                      ) : (
                        <Badge variant="warning">Atanmış</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {simCard.routers?.[0] ? (
                        <div className="flex items-center gap-1">
                          <Router className="h-4 w-4 text-[var(--muted-foreground)]" />
                          <span className="font-mono text-sm">
                            {simCard.routers[0].serialNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {simCard.routers?.[0]?.rvmUnit ? (
                        <span className="font-mono font-medium text-[var(--primary)]">
                          {simCard.routers[0].rvmUnit.rvmId}
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(simCard)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[var(--destructive)]"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Bu SIM kartı silmek istediğinize emin misiniz?"
                                  )
                                ) {
                                  deleteMutation.mutate(simCard.id)
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[var(--muted-foreground)]">
              Toplam {totalItems} SIM kart ({startIndex + 1}-{Math.min(endIndex, totalItems)} arası gösteriliyor)
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni SIM Kart</DialogTitle>
            <DialogDescription>
              Yeni bir SIM kart ekleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telefon Numarası *</Label>
              <div className="flex">
                <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
                  +90
                </div>
                <Input
                  id="phoneNumber"
                  placeholder="5XX XXX XX XX"
                  value={newPhoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setNewPhoneNumber(val)
                  }}
                  maxLength={10}
                  className="rounded-l-none font-mono"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                10 haneli telefon numarası (5 ile başlayan)
              </p>
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
                disabled={newPhoneNumber.length !== 10 || createMutation.isPending}
              >
                {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SIM Kart Düzenle</DialogTitle>
            <DialogDescription>
              Telefon numarasını güncelleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber">Telefon Numarası *</Label>
              <div className="flex">
                <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
                  +90
                </div>
                <Input
                  id="editPhoneNumber"
                  placeholder="5XX XXX XX XX"
                  value={editPhoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setEditPhoneNumber(val)
                  }}
                  maxLength={10}
                  className="rounded-l-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={editPhoneNumber.length !== 10 || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

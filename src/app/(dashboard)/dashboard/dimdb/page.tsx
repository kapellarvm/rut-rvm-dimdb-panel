"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Database,
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Upload,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "@/hooks/use-toast"
import { clearApiCache } from "@/lib/cache-utils"
import type { DimDb } from "@/types"

interface DimDbWithCount extends DimDb {
  _count: { routers: number }
}

export default function DimDbPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "OPERATOR"

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [newDimDbCode, setNewDimDbCode] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [bulkCodes, setBulkCodes] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch DIM-DB list
  const { data: dimDbList, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery<DimDbWithCount[]>({
    queryKey: ["dimdb-list", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        status: statusFilter !== "all" ? statusFilter : "",
      })
      const res = await fetch(`/api/dimdb?${params}`)
      if (!res.ok) throw new Error("Failed to fetch DIM-DB list")
      return res.json()
    },
  })

  // Pagination logic
  const totalItems = dimDbList?.length || 0
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDimDbList = dimDbList?.slice(startIndex, endIndex)

  // Create DIM-DB mutation
  const createMutation = useMutation({
    mutationFn: async (data: { dimDbCode: string; description?: string }) => {
      const res = await fetch("/api/dimdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create DIM-DB")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })
      toast({
        title: "Başarılı",
        description: "DIM-DB eklendi.",
        variant: "success",
      })
      setCreateDialogOpen(false)
      setNewDimDbCode("")
      setNewDescription("")
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "DIM-DB eklenemedi.",
        variant: "destructive",
      })
    },
  })

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (codes: string[]) => {
      const res = await fetch("/api/dimdb/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimDbCodes: codes }),
      })
      if (!res.ok) throw new Error("Failed to bulk create DIM-DB")
      return res.json()
    },
    onSuccess: async (data) => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })
      toast({
        title: "Başarılı",
        description: `${data.created} DIM-DB eklendi, ${data.skipped} atlandı.`,
        variant: "success",
      })
      setBulkDialogOpen(false)
      setBulkCodes("")
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Toplu ekleme başarısız oldu.",
        variant: "destructive",
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dimdb/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete DIM-DB")
      return res.json()
    },
    onSuccess: async () => {
      await clearApiCache()
      queryClient.invalidateQueries({ queryKey: ["dimdb-list"] })
      toast({
        title: "Başarılı",
        description: "DIM-DB silindi.",
        variant: "success",
      })
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "DIM-DB silinemedi.",
        variant: "destructive",
      })
    },
  })

  const handleCreate = () => {
    if (!newDimDbCode) return
    createMutation.mutate({
      dimDbCode: newDimDbCode,
      description: newDescription || undefined,
    })
  }

  const handleBulkCreate = () => {
    const codes = bulkCodes
      .split(/[\n,;]/)
      .map((code) => code.trim())
      .filter((code) => code.length > 0)

    if (codes.length === 0) return
    bulkCreateMutation.mutate(codes)
  }

  const availableCount = dimDbList?.filter((d) => d.status === "AVAILABLE").length || 0
  const assignedCount = dimDbList?.filter((d) => d.status === "ASSIGNED").length || 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="DIM-DB Yönetimi"
        description="DIM-DB ID'lerini yönetin ve atayın"
      >
        <div className="flex gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isLoading={isLoading}
            isFetching={isFetching}
            dataUpdatedAt={dataUpdatedAt}
          />
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Toplu Ekle
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni DIM-DB
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Toplam</p>
              <p className="text-2xl font-bold">{dimDbList?.length || 0}</p>
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
              placeholder="DIM-DB kodu ile ara..."
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
              <TableHead>DIM-DB Kodu</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Atanan Router</TableHead>
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
            ) : paginatedDimDbList?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-[var(--muted-foreground)]"
                >
                  DIM-DB bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              paginatedDimDbList?.map((dimDb) => (
                <TableRow key={dimDb.id}>
                  <TableCell>
                    <span className="font-mono font-medium">
                      {dimDb.dimDbCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    {dimDb.description || (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {dimDb.status === "AVAILABLE" ? (
                      <Badge variant="success">Müsait</Badge>
                    ) : (
                      <Badge variant="warning">Atanmış</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {dimDb._count.routers > 0 ? (
                      <span>{dimDb._count.routers} router</span>
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
                          <DropdownMenuItem
                            className="text-[var(--destructive)]"
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu DIM-DB'yi silmek istediğinize emin misiniz?"
                                )
                              ) {
                                deleteMutation.mutate(dimDb.id)
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
              Toplam {totalItems} DIM-DB ({startIndex + 1}-{Math.min(endIndex, totalItems)} arası gösteriliyor)
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
            <DialogTitle>Yeni DIM-DB</DialogTitle>
            <DialogDescription>
              Yeni bir DIM-DB ID'si ekleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dimDbCode">DIM-DB Kodu *</Label>
              <Input
                id="dimDbCode"
                placeholder="Örn: DIMDB-2024-001"
                value={newDimDbCode}
                onChange={(e) => setNewDimDbCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Input
                id="description"
                placeholder="Kısa açıklama"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
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
                disabled={!newDimDbCode || createMutation.isPending}
              >
                {createMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu DIM-DB Ekle</DialogTitle>
            <DialogDescription>
              Her satıra bir DIM-DB kodu yazın veya virgülle ayırın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkCodes">DIM-DB Kodları</Label>
              <Textarea
                id="bulkCodes"
                placeholder="DIMDB-001&#10;DIMDB-002&#10;DIMDB-003"
                value={bulkCodes}
                onChange={(e) => setBulkCodes(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Her satıra bir kod yazın veya virgül/noktalı virgülle ayırın
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setBulkDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleBulkCreate}
                disabled={!bulkCodes.trim() || bulkCreateMutation.isPending}
              >
                {bulkCreateMutation.isPending ? "Ekleniyor..." : "Toplu Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

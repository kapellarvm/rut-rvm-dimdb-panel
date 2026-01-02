"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, Clock, Filter, User } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"

interface ActivityDetails {
  rvmId?: string | null
  dimDbCode?: string | null
  dimDbId?: string | null
  serialNumber?: string
  created?: { rvm?: string; dimDb?: string }
  count?: number
  fileName?: string
  [key: string]: unknown
}

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: ActivityDetails | null
  createdAt: string
  user: { name: string; email: string }
}

interface ActivitiesResponse {
  data: ActivityLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Generate human-readable activity message
function getActivityMessage(activity: ActivityLog): string {
  const { action, entityType, details } = activity

  switch (action) {
    case "IMPORT":
      if (details?.count) {
        return `${details.count} router içe aktardı`
      }
      return "Excel içe aktardı"

    case "ASSIGN":
      if (details?.rvmId && details?.dimDbCode) {
        return `RVM (${details.rvmId}) ve DIM-DB (${details.dimDbCode}) atadı`
      } else if (details?.rvmId) {
        return `RVM atadı: ${details.rvmId}`
      } else if (details?.dimDbCode) {
        return `DIM-DB atadı: ${details.dimDbCode}`
      } else if (details?.dimDbId === "unassigned") {
        return "DIM-DB atamasını kaldırdı"
      }
      return "atama yaptı"

    case "CREATE":
      if (entityType === "RVM") {
        return `yeni RVM oluşturdu${details?.rvmId ? `: ${details.rvmId}` : ""}`
      } else if (entityType === "DIMDB") {
        return `yeni DIM-DB oluşturdu${details?.dimDbCode ? `: ${details.dimDbCode}` : ""}`
      }
      return "yeni kayıt oluşturdu"

    case "UPDATE":
      if (entityType === "ROUTER") {
        return "router bilgilerini güncelledi"
      } else if (entityType === "RVM") {
        return "RVM bilgilerini güncelledi"
      } else if (entityType === "USER") {
        return "kullanıcı bilgilerini güncelledi"
      }
      return "güncelleme yaptı"

    case "DELETE":
      if (entityType === "ROUTER") {
        return "router sildi"
      } else if (entityType === "RVM") {
        return "RVM sildi"
      } else if (entityType === "DIMDB") {
        return "DIM-DB sildi"
      }
      return "kayıt sildi"

    case "PASSWORD_CHANGE":
      return "şifresini değiştirdi"

    default:
      return action.toLowerCase()
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case "CREATE":
      return "bg-green-500"
    case "DELETE":
      return "bg-red-500"
    case "UPDATE":
      return "bg-blue-500"
    case "ASSIGN":
      return "bg-purple-500"
    case "IMPORT":
      return "bg-orange-500"
    default:
      return "bg-gray-500"
  }
}

function getEntityBadgeVariant(entityType: string): "default" | "secondary" | "success" | "warning" {
  switch (entityType) {
    case "ROUTER":
      return "default"
    case "RVM":
      return "secondary"
    case "DIMDB":
      return "success"
    default:
      return "secondary"
  }
}

export default function ActivitiesPage() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")

  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ["activities", page, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        action: actionFilter === "__all__" ? "" : actionFilter,
        entityType: entityFilter === "__all__" ? "" : entityFilter,
      })
      const res = await fetch(`/api/activities?${params}`)
      if (!res.ok) throw new Error("Failed to fetch activities")
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivite Geçmişi"
        description="Sistemdeki tüm aktiviteleri görüntüleyin"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Filter className="h-4 w-4" />
            <span>Filtreler:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="İşlem Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tüm İşlemler</SelectItem>
                <SelectItem value="CREATE">Oluşturma</SelectItem>
                <SelectItem value="UPDATE">Güncelleme</SelectItem>
                <SelectItem value="DELETE">Silme</SelectItem>
                <SelectItem value="ASSIGN">Atama</SelectItem>
                <SelectItem value="IMPORT">İçe Aktarma</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Varlık Tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tüm Varlıklar</SelectItem>
                <SelectItem value="ROUTER">Router</SelectItem>
                <SelectItem value="RVM">RVM</SelectItem>
                <SelectItem value="DIMDB">DIM-DB</SelectItem>
                <SelectItem value="USER">Kullanıcı</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Activities List */}
      <Card>
        <div className="divide-y divide-[var(--border)]">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-4">
                <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : data?.data.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <p className="text-[var(--muted-foreground)]">
                Henüz aktivite kaydı yok
              </p>
            </div>
          ) : (
            data?.data.map((activity) => (
              <div key={activity.id} className="p-4 flex items-start gap-4 hover:bg-[var(--accent)]/30 transition-colors">
                <div className={`h-3 w-3 rounded-full mt-1.5 shrink-0 ${getActionColor(activity.action)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">{activity.user.name}</span>{" "}
                    {getActivityMessage(activity)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(activity.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {activity.user.email}
                    </span>
                  </div>
                </div>
                <Badge variant={getEntityBadgeVariant(activity.entityType)} className="shrink-0 text-xs">
                  {activity.entityType}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Toplam {data.pagination.total} aktivite ({page}/{data.pagination.totalPages})
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
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import { Router, Server, Database, AlertCircle, Activity, Clock, ChevronRight, Wrench, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { StatsCard } from "@/components/shared/stats-card"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

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

interface DashboardStats {
  totalRouters: number
  totalRvmUnits: number
  assignedDimDb: number
  unassignedRouters: number
  recentActivity: {
    id: string
    action: string
    entityType: string
    details: ActivityDetails | null
    createdAt: string
    user: { name: string }
  }[]
}

// Generate human-readable activity message
function getActivityMessage(activity: DashboardStats["recentActivity"][0]): string {
  const { action, entityType, details } = activity

  switch (action) {
    case "IMPORT":
      if (details?.count) {
        return `${details.count} router içe aktardı`
      }
      return "Excel içe aktardı"

    case "ASSIGN":
      // Check what was assigned from details
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

interface ConsistencyReport {
  orphanedDimDbIds: number
  orphanedRvmUnitIds: number
  assignedButNoRouter: number
  availableButHasRouter: number
  fixed: boolean
  details: {
    orphanedDimDbRouters: string[]
    orphanedRvmRouters: string[]
    dimDbStatusFixed: string[]
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showConsistencyDetails, setShowConsistencyDetails] = useState(false)
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  // Consistency check query - only for SUPER_ADMIN
  const { data: consistencyReport, isLoading: isCheckingConsistency, refetch: refetchConsistency } = useQuery<ConsistencyReport>({
    queryKey: ["consistency-check"],
    queryFn: async () => {
      const res = await fetch("/api/admin/fix-consistency")
      if (!res.ok) throw new Error("Failed to check consistency")
      return res.json()
    },
    enabled: isSuperAdmin,
  })

  // Fix consistency mutation
  const fixConsistencyMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await fetch("/api/admin/fix-consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      })
      if (!res.ok) throw new Error("Failed to fix consistency")
      return res.json()
    },
    onSuccess: (data) => {
      if (data.fixed) {
        toast({
          title: "Başarılı",
          description: "Tutarsızlıklar düzeltildi!",
        })
        refetchConsistency()
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Düzeltme sırasında hata oluştu",
        variant: "destructive",
      })
    },
  })

  const hasConsistencyIssues = consistencyReport && (
    consistencyReport.orphanedDimDbIds > 0 ||
    consistencyReport.orphanedRvmUnitIds > 0 ||
    consistencyReport.assignedButNoRouter > 0 ||
    consistencyReport.availableButHasRouter > 0
  )

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Sistem durumuna genel bakış" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Sistem durumuna genel bakış"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Router"
          value={stats?.totalRouters ?? 0}
          icon={Router}
          iconClassName="bg-[var(--primary)]/10 text-[var(--primary)]"
        />
        <StatsCard
          title="RVM Birimleri"
          value={stats?.totalRvmUnits ?? 0}
          icon={Server}
          iconClassName="bg-purple-500/10 text-purple-500"
        />
        <StatsCard
          title="Atanmış DIM-DB"
          value={stats?.assignedDimDb ?? 0}
          icon={Database}
          iconClassName="bg-[var(--success)]/10 text-[var(--success)]"
        />
        <StatsCard
          title="Atanmamış Router"
          value={stats?.unassignedRouters ?? 0}
          icon={AlertCircle}
          iconClassName="bg-[var(--warning)]/10 text-[var(--warning)]"
        />
      </div>

      {/* Quick Overview Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--primary)]" />
              Son Aktiviteler
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/activities" className="text-xs text-[var(--muted-foreground)]">
                Tümünü Gör
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-[var(--primary)] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--foreground)]">
                        <span className="font-medium">{activity.user.name}</span>{" "}
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {activity.entityType}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                Henüz aktivite yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-[var(--success)]" />
              Sistem Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Veritabanı Bağlantısı
                </span>
                <Badge variant="success">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">
                  API Durumu
                </span>
                <Badge variant="success">Çalışıyor</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Son Güncelleme
                </span>
                <span className="text-sm">Şimdi</span>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <h4 className="text-sm font-medium mb-3">Hızlı İstatistikler</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[var(--secondary)]">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Atama Oranı
                    </p>
                    <p className="text-xl font-bold text-[var(--success)]">
                      {stats?.totalRouters
                        ? Math.round(
                            ((stats.assignedDimDb ?? 0) / stats.totalRouters) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--secondary)]">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Router/RVM
                    </p>
                    <p className="text-xl font-bold">
                      {stats?.totalRvmUnits && stats.totalRvmUnits > 0
                        ? (stats.totalRouters / stats.totalRvmUnits).toFixed(1)
                        : "0"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Consistency Card - Only for SUPER_ADMIN */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Veritabanı Tutarlılığı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCheckingConsistency ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Kontrol ediliyor...
              </div>
            ) : consistencyReport ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Durum</span>
                  {hasConsistencyIssues ? (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Tutarsızlık Tespit Edildi
                    </Badge>
                  ) : (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Tutarlı
                    </Badge>
                  )}
                </div>

                {/* Issue Details */}
                {hasConsistencyIssues && (
                  <div className="space-y-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Tespit Edilen Sorunlar:
                    </p>
                    <ul className="text-sm space-y-1 text-[var(--muted-foreground)]">
                      {consistencyReport.orphanedDimDbIds > 0 && (
                        <li>• {consistencyReport.orphanedDimDbIds} router&apos;da geçersiz DIM-DB referansı</li>
                      )}
                      {consistencyReport.orphanedRvmUnitIds > 0 && (
                        <li>• {consistencyReport.orphanedRvmUnitIds} router&apos;da geçersiz RVM referansı</li>
                      )}
                      {consistencyReport.assignedButNoRouter > 0 && (
                        <li>• {consistencyReport.assignedButNoRouter} DIM-DB &quot;ASSIGNED&quot; durumda ama bağlı değil</li>
                      )}
                      {consistencyReport.availableButHasRouter > 0 && (
                        <li>• {consistencyReport.availableButHasRouter} DIM-DB &quot;AVAILABLE&quot; durumda ama router&apos;a bağlı</li>
                      )}
                    </ul>

                    {showConsistencyDetails && consistencyReport.details && (
                      <div className="mt-3 pt-3 border-t border-orange-500/20 text-xs space-y-2">
                        {consistencyReport.details.orphanedDimDbRouters.length > 0 && (
                          <div>
                            <p className="font-medium">Geçersiz DIM-DB referanslı routerlar:</p>
                            <p className="text-[var(--muted-foreground)]">
                              {consistencyReport.details.orphanedDimDbRouters.join(", ")}
                            </p>
                          </div>
                        )}
                        {consistencyReport.details.orphanedRvmRouters.length > 0 && (
                          <div>
                            <p className="font-medium">Geçersiz RVM referanslı routerlar:</p>
                            <p className="text-[var(--muted-foreground)]">
                              {consistencyReport.details.orphanedRvmRouters.join(", ")}
                            </p>
                          </div>
                        )}
                        {consistencyReport.details.dimDbStatusFixed.length > 0 && (
                          <div>
                            <p className="font-medium">Status düzeltilecek DIM-DB&apos;ler:</p>
                            <p className="text-[var(--muted-foreground)]">
                              {consistencyReport.details.dimDbStatusFixed.join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchConsistency()}
                    disabled={isCheckingConsistency}
                  >
                    Yeniden Kontrol Et
                  </Button>

                  {hasConsistencyIssues && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConsistencyDetails(!showConsistencyDetails)}
                      >
                        {showConsistencyDetails ? "Detayları Gizle" : "Detayları Göster"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => fixConsistencyMutation.mutate(false)}
                        disabled={fixConsistencyMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {fixConsistencyMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Düzeltiliyor...
                          </>
                        ) : (
                          "Tutarsızlıkları Düzelt"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Tutarlılık bilgisi yüklenemedi
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

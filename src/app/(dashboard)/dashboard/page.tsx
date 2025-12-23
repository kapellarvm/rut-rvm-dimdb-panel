"use client"

import { useQuery } from "@tanstack/react-query"
import { Router, Server, Database, AlertCircle, Activity, Clock } from "lucide-react"
import { StatsCard } from "@/components/shared/stats-card"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"

interface DashboardStats {
  totalRouters: number
  totalRvmUnits: number
  assignedDimDb: number
  unassignedRouters: number
  recentActivity: {
    id: string
    action: string
    entityType: string
    details: Record<string, string> | null
    createdAt: string
    user: { name: string }
  }[]
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

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
          </CardHeader>
          <CardContent>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-[var(--primary)] mt-2" />
                    <div className="flex-1">
                      <p className="text-[var(--foreground)]">
                        <span className="font-medium">{activity.user.name}</span>{" "}
                        {activity.action === "IMPORT" && "excel içe aktardı"}
                        {activity.action === "ASSIGN" && "DIM-DB atadı"}
                        {activity.action === "UPDATE" && "güncelleme yaptı"}
                        {activity.action === "CREATE" && "yeni kayıt ekledi"}
                        {activity.action === "DELETE" && "kayıt sildi"}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
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
    </div>
  )
}

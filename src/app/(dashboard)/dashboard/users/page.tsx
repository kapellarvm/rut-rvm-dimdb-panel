"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Users,
  Plus,
  MoreHorizontal,
  Shield,
  Eye,
  Trash2,
  Edit,
  Settings,
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
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

interface User {
  id: string
  email: string
  name: string
  role: "SUPER_ADMIN" | "ADMIN" | "VIEWER"
  createdAt: string
  lastLogin: string | null
}

export default function UsersPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "VIEWER" as "SUPER_ADMIN" | "ADMIN" | "VIEWER",
  })

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
    enabled: isAdmin,
  })

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create user")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "Başarılı",
        description: "Kullanıcı oluşturuldu.",
        variant: "success",
      })
      setCreateDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.",
        variant: "destructive",
      })
    },
  })

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<typeof formData>
    }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update user")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "Başarılı",
        description: "Kullanıcı güncellendi.",
        variant: "success",
      })
      setEditUser(null)
      resetForm()
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kullanıcı güncellenemedi.",
        variant: "destructive",
      })
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete user")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "Başarılı",
        description: "Kullanıcı silindi.",
        variant: "success",
      })
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Kullanıcı silinemedi.",
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "VIEWER",
    })
  }

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.name) return
    createMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (!editUser) return
    const updateData: Partial<typeof formData> = {}
    if (formData.email && formData.email !== editUser.email)
      updateData.email = formData.email
    if (formData.name && formData.name !== editUser.name)
      updateData.name = formData.name
    if (formData.role && formData.role !== editUser.role)
      updateData.role = formData.role
    if (formData.password) updateData.password = formData.password

    updateMutation.mutate({ id: editUser.id, data: updateData })
  }

  const openEditDialog = (user: User) => {
    setEditUser(user)
    setFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
    })
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Kullanıcı Yönetimi"
          description="Sistem kullanıcılarını yönetin"
        />
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-[var(--warning)] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Yetkisiz Erişim</h3>
          <p className="text-[var(--muted-foreground)]">
            Bu sayfayı görüntülemek için Süper Admin yetkisine sahip olmanız
            gerekiyor.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Sistem kullanıcılarını yönetin"
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </PageHeader>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Son Giriş</TableHead>
              <TableHead>Kayıt Tarihi</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-[var(--muted-foreground)]"
                >
                  Kullanıcı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                        <span className="text-[var(--primary)] font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium whitespace-nowrap">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "SUPER_ADMIN" ? (
                      <Badge className="flex items-center gap-1 w-fit whitespace-nowrap">
                        <Shield className="h-3 w-3" />
                        Süper Admin
                      </Badge>
                    ) : user.role === "ADMIN" ? (
                      <Badge variant="primary" className="flex items-center gap-1 w-fit whitespace-nowrap">
                        <Settings className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit whitespace-nowrap">
                        <Eye className="h-3 w-3" />
                        İzleyici
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {user.lastLogin ? (
                      formatDate(user.lastLogin)
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        {user.id !== session?.user?.id && (
                          <DropdownMenuItem
                            className="text-[var(--destructive)]"
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu kullanıcıyı silmek istediğinize emin misiniz?"
                                )
                              ) {
                                deleteMutation.mutate(user.id)
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
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
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editUser}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditUser(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}
            </DialogTitle>
            <DialogDescription>
              {editUser
                ? "Kullanıcı bilgilerini güncelleyin"
                : "Yeni bir kullanıcı hesabı oluşturun"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">İsim *</Label>
              <Input
                id="name"
                placeholder="Kullanıcı adı"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Şifre {editUser ? "(Boş bırakırsanız değişmez)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "SUPER_ADMIN" | "ADMIN" | "VIEWER") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Süper Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="VIEWER">İzleyici</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false)
                  setEditUser(null)
                  resetForm()
                }}
              >
                İptal
              </Button>
              <Button
                onClick={editUser ? handleUpdate : handleCreate}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (!editUser && (!formData.email || !formData.password || !formData.name))
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Kaydediliyor..."
                  : editUser
                  ? "Güncelle"
                  : "Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Download,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ImportResult {
  success: boolean
  totalRows: number
  newCount: number
  updatedCount: number
  errorCount: number
  errors: { row: number; message: string }[]
  createdRvmUnits: string[]
  columnMappings: {
    excelColumn: string
    systemField: string | null
    confidence: number
  }[]
}

export default function ImportPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Import failed")
      }

      return res.json() as Promise<ImportResult>
    },
    onSuccess: (data) => {
      setImportResult(data)
      queryClient.invalidateQueries({ queryKey: ["routers"] })
      queryClient.invalidateQueries({ queryKey: ["rvm-units"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })

      if (data.success) {
        toast({
          title: "Import Başarılı",
          description: `${data.newCount} yeni, ${data.updatedCount} güncelleme`,
          variant: "success",
        })
      } else {
        toast({
          title: "Import Tamamlandı",
          description: `${data.errorCount} hata ile tamamlandı`,
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      toast({
        title: "Import Hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive",
      })
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setImportResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: !isAdmin,
  })

  const handleImport = () => {
    if (!selectedFile) return
    importMutation.mutate(selectedFile)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Excel Import"
          description="Router verilerini Excel'den içe aktarın"
        />
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-[var(--warning)] mb-4" />
          <h3 className="text-lg font-semibold mb-2">Yetkisiz Erişim</h3>
          <p className="text-[var(--muted-foreground)]">
            Bu özelliği kullanmak için Süper Admin yetkisine sahip olmanız
            gerekiyor.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Import"
        description="Router verilerini Excel'den içe aktarın"
      />

      {/* Import Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Dosya Yükle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--muted-foreground)]",
              importMutation.isPending && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="h-12 w-12 text-[var(--success)]" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReset()
                  }}
                >
                  Dosyayı Değiştir
                </Button>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-[var(--primary)]" />
                <p className="text-[var(--primary)] font-medium">
                  Dosyayı buraya bırakın
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-[var(--muted-foreground)]" />
                <div>
                  <p className="font-medium">
                    Excel dosyasını sürükleyip bırakın
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    veya dosya seçmek için tıklayın
                  </p>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Desteklenen formatlar: .xlsx, .xls, .csv
                </p>
              </div>
            )}
          </div>

          {selectedFile && !importResult && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                İptal
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Et
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Toplam Satır
                  </p>
                  <p className="text-2xl font-bold">{importResult.totalRows}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Yeni Eklenen
                  </p>
                  <p className="text-2xl font-bold">{importResult.newCount}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-[var(--warning)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Güncellenen
                  </p>
                  <p className="text-2xl font-bold">
                    {importResult.updatedCount}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--destructive)]/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-[var(--destructive)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Hata</p>
                  <p className="text-2xl font-bold">
                    {importResult.errorCount}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Column Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>Kolon Eşleştirmeleri</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Excel Kolonu</TableHead>
                    <TableHead>Sistem Alanı</TableHead>
                    <TableHead>Güven</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.columnMappings.map((mapping, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {mapping.excelColumn}
                      </TableCell>
                      <TableCell>
                        {mapping.systemField ? (
                          <Badge variant="primary">{mapping.systemField}</Badge>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">
                            Eşleşmedi
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.systemField && (
                          <Badge
                            variant={
                              mapping.confidence >= 0.8
                                ? "success"
                                : mapping.confidence >= 0.5
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {Math.round(mapping.confidence * 100)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Created RVM Units */}
          {importResult.createdRvmUnits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Oluşturulan RVM Birimleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {importResult.createdRvmUnits.map((rvmId) => (
                    <Badge key={rvmId} variant="secondary">
                      {rvmId}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[var(--destructive)]">
                  Hatalar ({importResult.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satır</TableHead>
                      <TableHead>Hata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.errors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>Satır {error.row}</TableCell>
                        <TableCell className="text-[var(--destructive)]">
                          {error.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={handleReset}>
              Yeni Import
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedFile && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Akıllı Parser Özellikleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Otomatik Kolon Algılama</h4>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Parser, Excel kolon başlıklarını otomatik olarak tanır. &quot;S/N&quot;,
                  &quot;Serial&quot;, &quot;Seri No&quot; gibi farklı isimlendirmeler
                  otomatik eşleştirilir.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Veri Temizleme</h4>
                <p className="text-sm text-[var(--muted-foreground)]">
                  IMEI, MAC adresi ve seri numarası gibi alanlar otomatik olarak
                  temizlenir ve formatlanır.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Akıllı Birleştirme</h4>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Mevcut kayıtlar seri numarası veya IMEI ile eşleştirilir.
                  Güncelleme yapılırken mevcut DIM-DB atamaları korunur.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">RVM Otomatik Oluşturma</h4>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Excel&apos;de belirtilen RVM ID&apos;leri otomatik olarak oluşturulur
                  ve router&apos;lar bu birimlere atanır.
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="font-semibold mb-2">Desteklenen Kolon İsimleri</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "S/N, Serial, Seri No",
                  "IMEI",
                  "MAC, MAC Address",
                  "Box No, Kutu",
                  "Firmware, FW",
                  "SSID",
                  "WiFi Password",
                  "Device Password",
                  "RVM ID",
                  "DIM-DB ID",
                ].map((col) => (
                  <Badge key={col} variant="secondary">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

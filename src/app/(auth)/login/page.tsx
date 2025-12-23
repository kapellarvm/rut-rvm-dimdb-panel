"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Server, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi girin"),
  password: z.string().min(1, "Şifre gerekli"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "Giriş Başarısız",
          description: "Email veya şifre hatalı.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Giriş Başarılı",
          description: "Yönlendiriliyorsunuz...",
          variant: "success",
        })
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      toast({
        title: "Hata",
        description: "Bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[var(--primary)] flex items-center justify-center mb-4">
            <Server className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold">RUT-RVM Panel</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Router & DIM-DB Yönetim Sistemi
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-[var(--border)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Giriş Yap</CardTitle>
            <CardDescription className="text-center">
              Devam etmek için hesabınıza giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-xs text-[var(--destructive)]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-[var(--destructive)]">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials info */}
        <div className="mt-6 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] text-center mb-2">
            Demo Hesap Bilgileri
          </p>
          <div className="space-y-1 text-xs text-center">
            <p>
              <span className="text-[var(--muted-foreground)]">Admin:</span>{" "}
              <span className="font-mono">admin@rutpanel.com</span>
            </p>
            <p>
              <span className="text-[var(--muted-foreground)]">Şifre:</span>{" "}
              <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

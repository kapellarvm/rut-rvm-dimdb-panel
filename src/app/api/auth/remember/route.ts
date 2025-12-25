import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const cookieStore = await cookies()
  const cookieName = process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"

  const sessionToken = cookieStore.get(cookieName)

  if (!sessionToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 })
  }

  // Cookie'yi 30 günlük persistent cookie olarak yeniden set et
  // NextResponse üzerinden set edilmeli, cookieStore.set() route handler'da çalışmaz
  const response = NextResponse.json({ success: true })
  response.cookies.set(cookieName, sessionToken.value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  })

  return response
}

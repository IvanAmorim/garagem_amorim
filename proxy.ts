import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/register"]
const authRoutes = ["/login", "/register"]

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))
  const isAuth = authRoutes.some((r) => pathname.startsWith(r))
  const isApi = pathname.startsWith("/api/auth")

  if (isApi) return NextResponse.next()

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isAuth) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

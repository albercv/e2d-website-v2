import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE_NAME = "admin_session"

const PUBLIC_PATHS = ["/admin/login", "/api/admin/login"]

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0
  const padded = b64 + "=".repeat(pad)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeBase64UrlJson<T = any>(b64url: string): T | null {
  try {
    const bytes = base64urlToUint8Array(b64url)
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function verifyJwtHS256(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const [headerB64, payloadB64, signatureB64] = parts

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ])

    const data = `${headerB64}.${payloadB64}`
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data))

    const sigBytes = new Uint8Array(signature)
    let binary = ""
    for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i])
    const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")

    if (base64 !== signatureB64) return false

    const payload = decodeBase64UrlJson<any>(payloadB64)
    if (!payload) return false

    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp === "number" && payload.exp < now) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPath = pathname.startsWith("/admin")
  const isAdminApiPath = pathname.startsWith("/api/admin")

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if ((isAdminPath || isAdminApiPath) && !isPublic) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    const secret = process.env.ADMIN_SESSION_SECRET

    if (!token || !secret || !(await verifyJwtHS256(token, secret))) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = "/admin/login"
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
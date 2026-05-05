import { NextResponse } from "next/server"

// Locales soportados en la web
const SUPPORTED_LOCALES = ["es", "en", "it"] as const
const DEFAULT_LOCALE = "es"

type SupportedLocale = typeof SUPPORTED_LOCALES[number]

function extractLocaleFromPath(pathname: string): SupportedLocale | null {
  const segments = pathname.split('/').filter(Boolean)
  const candidate = segments[0]
  return SUPPORTED_LOCALES.includes(candidate as SupportedLocale)
    ? (candidate as SupportedLocale)
    : null
}

function detectLocaleFromReferer(referer: string | null): SupportedLocale | null {
  if (!referer) return null
  try {
    const url = new URL(referer)
    return extractLocaleFromPath(url.pathname)
  } catch {
    return null
  }
}

function detectLocaleFromCookie(cookieHeader: string | null): SupportedLocale | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const nextLocale = cookies.find(c => c.startsWith('NEXT_LOCALE='))
  if (!nextLocale) return null
  const value = decodeURIComponent(nextLocale.split('=')[1] || '')
  // Normalizar: es-ES -> es, en-US -> en
  const base = value.split('-')[0]
  return SUPPORTED_LOCALES.includes(base as SupportedLocale)
    ? (base as SupportedLocale)
    : null
}

function detectLocaleFromAcceptLanguage(header: string | null): SupportedLocale | null {
  if (!header) return null
  const entries = header.split(',').map(e => e.trim())
  for (const entry of entries) {
    const lang = entry.split(';')[0]
    const base = lang.split('-')[0]
    if (SUPPORTED_LOCALES.includes(base as SupportedLocale)) {
      return base as SupportedLocale
    }
  }
  return null
}

// Resuelve la URL pública del sitio. Necesario porque PM2 lanza el standalone
// server detrás de nginx con HOSTNAME=127.0.0.1 y trustHostHeader=false, así
// que `req.url` se ve como http://127.0.0.1:3003/... en producción.
// Prioridad: NEXT_PUBLIC_BASE_URL > headers proxy (X-Forwarded-Host/Proto) > req.url.
function getPublicBaseUrl(req: Request): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL
  if (envBase) return envBase
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`
  return req.url
}

export async function POST(req: Request) {
  // Detectar el idioma preferido del usuario (orden: Referer -> cookie NEXT_LOCALE -> Accept-Language -> por defecto)
  const headers = req.headers
  const referer = headers.get('referer')
  const cookieHeader = headers.get('cookie')
  const acceptLanguage = headers.get('accept-language')

  const locale =
    detectLocaleFromReferer(referer) ||
    detectLocaleFromCookie(cookieHeader) ||
    detectLocaleFromAcceptLanguage(acceptLanguage) ||
    DEFAULT_LOCALE

  const res = NextResponse.redirect(new URL(`/${locale}`, getPublicBaseUrl(req)), 303)
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  })
  return res
}
import { NextResponse } from "next/server"

// Locales soportados en la web
const SUPPORTED_LOCALES = ["es", "en"] as const
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

  const res = NextResponse.redirect(new URL(`/${locale}`, req.url), 303)
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  })
  return res
}
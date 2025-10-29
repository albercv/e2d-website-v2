import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isAICrawler, logCrawlerRequest, identifyCrawler } from "./lib/ai-crawler-logger"
import { analyzeRequest, defaultSecurityConfig, cleanupOldData } from "./lib/ai-crawler-security"

const COOKIE_NAME = "admin_session"

const PUBLIC_PATHS = ["/admin/login", "/api/admin/login"]

// Rate limiting para crawlers IA (requests por minuto)
const CRAWLER_RATE_LIMITS = {
  'GPTBot': 60,
  'Google-Extended': 120,
  'ClaudeBot': 60,
  'ChatGPT-User': 30,
  'Bingbot': 100,
  'Unknown': 10,
} as const

// Cache en memoria para rate limiting (en producción usar Redis)
const crawlerRequestCache = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string, crawlerType: string): string {
  return `${crawlerType}:${ip}`
}

function isRateLimited(ip: string, crawlerType: keyof typeof CRAWLER_RATE_LIMITS): boolean {
  const key = getRateLimitKey(ip, crawlerType)
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  
  const cached = crawlerRequestCache.get(key)
  
  if (!cached || now > cached.resetTime) {
    // Nueva ventana de tiempo
    crawlerRequestCache.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }
  
  if (cached.count >= CRAWLER_RATE_LIMITS[crawlerType]) {
    return true
  }
  
  cached.count++
  return false
}

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
  const startTime = Date.now()
  const { pathname } = req.nextUrl
  const userAgent = req.headers.get('user-agent') || ''
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'

  // Detectar si es un crawler IA
  const isAICrawlerRequest = isAICrawler(userAgent)
  let response: NextResponse

  if (isAICrawlerRequest) {
    const crawlerType = identifyCrawler(userAgent)
    
    // Análisis de seguridad avanzado
    const securityAnalysis = analyzeRequest(req, crawlerType, defaultSecurityConfig)
    
    if (!securityAnalysis.allowed) {
      console.log(`[SECURITY-BLOCKED] ${crawlerType} from ${ip} blocked:`, securityAnalysis.violations)
      
      // Determinar el código de respuesta basado en el tipo de violación
      let statusCode = 403 // Forbidden por defecto
      const violationTypes = securityAnalysis.violations.map(v => v.type)
      
      if (violationTypes.includes('rate_limit')) {
        statusCode = 429 // Too Many Requests
      } else if (violationTypes.includes('blacklist')) {
        statusCode = 403 // Forbidden
      } else if (violationTypes.includes('suspicious_pattern')) {
        statusCode = 404 // Not Found (ocultar la existencia)
      } else if (violationTypes.includes('emergency_mode')) {
        statusCode = 503 // Service Unavailable
      }
      
      response = new NextResponse('Access denied', { status: statusCode })
      
      // Log de la violación de seguridad
      const responseTime = Date.now() - startTime
      await logCrawlerRequest(req, statusCode, responseTime)
      
      return response
    }

    console.log(`[AI-CRAWLER] ${crawlerType} accessing ${pathname} - Security check passed`)
  }

  // Lógica de autenticación existente para rutas admin
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
      response = NextResponse.redirect(loginUrl)
      
      // Log para crawlers IA que intentan acceder a rutas protegidas
      if (isAICrawlerRequest) {
        const responseTime = Date.now() - startTime
        await logCrawlerRequest(req, 302, responseTime)
      }
      
      return response
    }
  }

  response = NextResponse.next()

  // Log para todas las requests de crawlers IA exitosas
  if (isAICrawlerRequest) {
    const responseTime = Date.now() - startTime
    // Usar 200 como código por defecto para requests exitosas
    await logCrawlerRequest(req, 200, responseTime)
  }

  // Limpieza periódica de datos antiguos (cada 1000 requests aproximadamente)
  if (Math.random() < 0.001) {
    cleanupOldData()
  }

  return response
}

export const config = {
  matcher: [
    // Rutas admin existentes
    "/admin/:path*", 
    "/api/admin/:path*",
    // Todas las rutas públicas para logging de crawlers IA
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
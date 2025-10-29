/**
 * Rate Limiter Service
 * 
 * Sistema de rate limiting para proteger endpoints MCP contra abuso.
 * Implementa múltiples estrategias de limitación basadas en IP, User-Agent y tokens.
 * 
 * @module RateLimiter
 * @version 1.0.0
 */

import { NextRequest } from "next/server"

/**
 * Configuración de rate limiting
 */
interface RateLimitConfig {
  /** Número máximo de requests por ventana de tiempo */
  maxRequests: number
  /** Ventana de tiempo en milisegundos */
  windowMs: number
  /** Mensaje de error personalizado */
  message?: string
  /** Headers adicionales en respuesta de rate limit */
  headers?: Record<string, string>
}

/**
 * Entrada de rate limiting
 */
interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

/**
 * Resultado de verificación de rate limit
 */
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Clase principal del rate limiter
 */
export class RateLimiter {
  private static instance: RateLimiter
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  /**
   * Verifica si una request está dentro de los límites
   */
  public checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // Si no existe entrada, crear nueva
    if (!entry) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      })

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }

    // Si la ventana ha expirado, resetear
    if (now >= entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      })

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }

    // Incrementar contador
    entry.count++

    // Verificar si excede el límite
    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Genera identificador único para rate limiting
   */
  public generateIdentifier(request: NextRequest, strategy: 'ip' | 'user-agent' | 'combined' = 'combined'): string {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    switch (strategy) {
      case 'ip':
        return `ip:${ip}`
      case 'user-agent':
        return `ua:${this.hashUserAgent(userAgent)}`
      case 'combined':
        return `combined:${ip}:${this.hashUserAgent(userAgent)}`
      default:
        return `combined:${ip}:${this.hashUserAgent(userAgent)}`
    }
  }

  /**
   * Obtiene la IP del cliente
   */
  private getClientIP(request: NextRequest): string {
    // Intentar obtener IP real desde headers de proxy
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
      return realIP
    }

    // Fallback a IP de conexión directa
    return request.ip || 'unknown'
  }

  /**
   * Genera hash simple del user agent para anonimización
   */
  private hashUserAgent(userAgent: string): string {
    let hash = 0
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Limpia entradas expiradas del store
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  public getStats(): {
    totalEntries: number
    activeEntries: number
    memoryUsage: number
  } {
    const now = Date.now()
    let activeEntries = 0

    for (const entry of this.store.values()) {
      if (now < entry.resetTime) {
        activeEntries++
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries,
      memoryUsage: process.memoryUsage().heapUsed
    }
  }

  /**
   * Limpia manualmente todas las entradas
   */
  public clear(): void {
    this.store.clear()
  }

  /**
   * Destructor para limpiar recursos
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

/**
 * Configuraciones predefinidas de rate limiting
 */
export const RATE_LIMIT_CONFIGS = {
  // Para herramientas MCP generales
  MCP_GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: 'Too many MCP requests. Please try again later.'
  },

  // Para el agente IA (más restrictivo)
  MCP_AGENT: {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutos
    message: 'Too many AI agent requests. Please try again later.'
  },

  // Para requests de manifiesto (muy permisivo)
  MCP_MANIFEST: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: 'Too many manifest requests. Please try again later.'
  },

  // Para desarrollo/testing (muy permisivo)
  DEVELOPMENT: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Development rate limit exceeded.'
  }
} as const

/**
 * Instancia singleton del rate limiter
 */
export const rateLimiter = RateLimiter.getInstance()

/**
 * Middleware helper para aplicar rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (request: NextRequest) => {
    const identifier = rateLimiter.generateIdentifier(request)
    return rateLimiter.checkLimit(identifier, config)
  }
}

/**
 * Verifica si el entorno es de desarrollo
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Obtiene configuración de rate limit basada en el entorno
 */
export function getRateLimitConfig(type: keyof typeof RATE_LIMIT_CONFIGS): RateLimitConfig {
  if (isDevelopment()) {
    return RATE_LIMIT_CONFIGS.DEVELOPMENT
  }
  return RATE_LIMIT_CONFIGS[type]
}
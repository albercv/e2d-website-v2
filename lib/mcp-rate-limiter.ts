/**
 * MCP Rate Limiter
 * Sistema de control de frecuencia para herramientas MCP
 * Implementa rate limiting básico por IP y por herramienta
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

interface RateLimitConfig {
  windowMs: number      // Ventana de tiempo en ms
  maxRequests: number   // Máximo de requests por ventana
  skipSuccessfulGET?: boolean  // Omitir GET exitosos del conteo
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Configuraciones de rate limiting por herramienta
 */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'posts.search': {
    windowMs: 60 * 1000,    // 1 minuto
    maxRequests: 30,        // 30 requests por minuto
    skipSuccessfulGET: true // No contar GET exitosos
  },
  'appointments.create': {
    windowMs: 60 * 1000,    // 1 minuto
    maxRequests: 5,         // 5 appointments por minuto
    skipSuccessfulGET: false
  },
  'default': {
    windowMs: 60 * 1000,    // 1 minuto
    maxRequests: 20,        // 20 requests por minuto por defecto
    skipSuccessfulGET: false
  }
}

/**
 * Almacén en memoria para rate limiting
 * En producción se podría usar Redis
 */
class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

/**
 * Rate Limiter para herramientas MCP
 */
export class MCPRateLimiter {
  private store: InMemoryRateLimitStore

  constructor() {
    this.store = new InMemoryRateLimitStore()
  }

  /**
   * Verifica si una request está permitida
   */
  checkLimit(
    ip: string,
    toolName: string,
    method: string = 'GET',
    isSuccess: boolean = true
  ): RateLimitResult {
    const config = RATE_LIMIT_CONFIGS[toolName] || RATE_LIMIT_CONFIGS.default
    const key = `${ip}:${toolName}`
    const now = Date.now()

    // Obtener entrada actual
    let entry = this.store.get(key)

    // Si no existe o ha expirado, crear nueva
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      }
    }

    // Verificar si debemos omitir esta request del conteo
    const shouldSkip = config.skipSuccessfulGET && 
                      method === 'GET' && 
                      isSuccess

    if (!shouldSkip) {
      entry.count++
    }

    // Guardar entrada actualizada
    this.store.set(key, entry)

    // Verificar límite
    const allowed = entry.count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - entry.count)
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter
    }
  }

  /**
   * Obtiene estadísticas de uso para una IP y herramienta
   */
  getUsageStats(ip: string, toolName: string): {
    currentCount: number
    maxRequests: number
    windowMs: number
    resetTime: number
  } | null {
    const config = RATE_LIMIT_CONFIGS[toolName] || RATE_LIMIT_CONFIGS.default
    const key = `${ip}:${toolName}`
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    return {
      currentCount: entry.count,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      resetTime: entry.resetTime
    }
  }

  /**
   * Resetea el contador para una IP y herramienta específica
   */
  resetLimit(ip: string, toolName: string): void {
    const key = `${ip}:${toolName}`
    this.store.delete(key)
  }

  /**
   * Obtiene todas las configuraciones de rate limiting
   */
  getConfigs(): Record<string, RateLimitConfig> {
    return { ...RATE_LIMIT_CONFIGS }
  }

  /**
   * Actualiza la configuración de rate limiting para una herramienta
   */
  updateConfig(toolName: string, config: RateLimitConfig): void {
    RATE_LIMIT_CONFIGS[toolName] = { ...config }
  }

  /**
   * Limpia todos los datos del store
   */
  clear(): void {
    this.store.destroy()
  }
}

// Instancia singleton
export const mcpRateLimiter = new MCPRateLimiter()

/**
 * Middleware helper para Next.js
 */
export function createRateLimitMiddleware(toolName: string) {
  return (request: Request): RateLimitResult => {
    // Obtener IP del request
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Obtener método
    const method = request.method

    // Verificar límite (asumimos éxito por defecto, se actualizará después)
    return mcpRateLimiter.checkLimit(ip, toolName, method, true)
  }
}

/**
 * Headers de rate limiting para respuestas HTTP
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}
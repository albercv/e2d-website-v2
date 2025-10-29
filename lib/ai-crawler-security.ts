import { NextRequest } from 'next/server'

// Tipos para el sistema de seguridad
export interface SecurityConfig {
  rateLimits: {
    [crawlerType: string]: {
      requestsPerMinute: number
      requestsPerHour: number
      requestsPerDay: number
      burstLimit: number // Límite de ráfaga
    }
  }
  anomalyDetection: {
    enabled: boolean
    suspiciousPatterns: string[]
    maxRequestsPerSecond: number
    maxConcurrentRequests: number
  }
  ipWhitelist?: string[]
  ipBlacklist?: string[]
  protectedPaths: string[]
  emergencyMode: {
    enabled: boolean
    allowedCrawlers: string[]
    maxRequestsPerMinute: number
  }
}

export interface SecurityViolation {
  type: 'rate_limit' | 'anomaly' | 'blacklist' | 'suspicious_pattern' | 'emergency_mode'
  crawlerType: string
  ip: string
  userAgent: string
  path: string
  timestamp: string
  details: any
}

export interface CrawlerMetrics {
  ip: string
  crawlerType: string
  requestCount: number
  lastRequest: string
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  violations: SecurityViolation[]
}

// Configuración de seguridad por defecto
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimits: {
    'GPTBot': {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
    },
    'Google-Extended': {
      requestsPerMinute: 60,
      requestsPerHour: 2000,
      requestsPerDay: 20000,
      burstLimit: 15,
    },
    'ClaudeBot': {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
    },
    'ChatGPT-User': {
      requestsPerMinute: 20,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      burstLimit: 5,
    },
    'Bingbot': {
      requestsPerMinute: 40,
      requestsPerHour: 1500,
      requestsPerDay: 15000,
      burstLimit: 12,
    },
    'default': {
      requestsPerMinute: 10,
      requestsPerHour: 200,
      requestsPerDay: 2000,
      burstLimit: 3,
    },
  },
  anomalyDetection: {
    enabled: true,
    suspiciousPatterns: [
      '/admin',
      '/api/admin',
      '/.env',
      '/wp-admin',
      '/phpmyadmin',
      '/config',
      '/backup',
      '/database',
      '/.git',
      '/node_modules',
    ],
    maxRequestsPerSecond: 10,
    maxConcurrentRequests: 5,
  },
  ipBlacklist: [],
  protectedPaths: [
    '/api/admin',
    '/admin',
    '/private',
    '/_next/static',
    '/api/auth',
  ],
  emergencyMode: {
    enabled: false,
    allowedCrawlers: ['GPTBot', 'Google-Extended'],
    maxRequestsPerMinute: 5,
  },
}

// Cache en memoria para métricas de crawlers
const crawlerMetricsCache = new Map<string, CrawlerMetrics>()
const violationsCache: SecurityViolation[] = []
const requestTimestamps = new Map<string, number[]>()

/**
 * Obtiene la clave única para un crawler (IP + tipo)
 */
function getCrawlerKey(ip: string, crawlerType: string): string {
  return `${ip}:${crawlerType}`
}

/**
 * Verifica si una IP está en la lista negra
 */
export function isBlacklisted(ip: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): boolean {
  return config.ipBlacklist?.includes(ip) || false
}

/**
 * Verifica si una IP está en la lista blanca
 */
export function isWhitelisted(ip: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): boolean {
  return config.ipWhitelist?.includes(ip) || false
}

/**
 * Detecta patrones sospechosos en la URL
 */
export function detectSuspiciousPattern(
  path: string, 
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): string | null {
  if (!config.anomalyDetection.enabled) return null

  for (const pattern of config.anomalyDetection.suspiciousPatterns) {
    if (path.toLowerCase().includes(pattern.toLowerCase())) {
      return pattern
    }
  }
  return null
}

/**
 * Verifica límites de velocidad para un crawler
 */
export function checkRateLimit(
  ip: string,
  crawlerType: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): {
  allowed: boolean
  violation?: SecurityViolation
  metrics: CrawlerMetrics
} {
  const key = getCrawlerKey(ip, crawlerType)
  const now = Date.now()
  const currentTime = new Date().toISOString()

  // Obtener o crear métricas del crawler
  let metrics = crawlerMetricsCache.get(key)
  if (!metrics) {
    metrics = {
      ip,
      crawlerType,
      requestCount: 0,
      lastRequest: currentTime,
      requestsPerMinute: 0,
      requestsPerHour: 0,
      requestsPerDay: 0,
      violations: [],
    }
    crawlerMetricsCache.set(key, metrics)
  }

  // Obtener límites para este tipo de crawler
  const limits = config.rateLimits[crawlerType] || config.rateLimits['default']

  // Obtener timestamps de requests para este crawler
  let timestamps = requestTimestamps.get(key) || []
  
  // Limpiar timestamps antiguos (más de 24 horas)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  timestamps = timestamps.filter(ts => ts > oneDayAgo)
  
  // Calcular métricas de tiempo
  const oneMinuteAgo = now - (60 * 1000)
  const oneHourAgo = now - (60 * 60 * 1000)
  
  const requestsLastMinute = timestamps.filter(ts => ts > oneMinuteAgo).length
  const requestsLastHour = timestamps.filter(ts => ts > oneHourAgo).length
  const requestsLastDay = timestamps.length

  // Verificar límite de ráfaga (últimos 10 segundos)
  const tenSecondsAgo = now - (10 * 1000)
  const burstRequests = timestamps.filter(ts => ts > tenSecondsAgo).length

  // Actualizar métricas
  metrics.requestCount++
  metrics.lastRequest = currentTime
  metrics.requestsPerMinute = requestsLastMinute + 1
  metrics.requestsPerHour = requestsLastHour + 1
  metrics.requestsPerDay = requestsLastDay + 1

  // Verificar límites
  let violation: SecurityViolation | undefined

  if (burstRequests >= limits.burstLimit) {
    violation = {
      type: 'rate_limit',
      crawlerType,
      ip,
      userAgent: `${crawlerType} crawler`,
      path: '',
      timestamp: currentTime,
      details: {
        limitType: 'burst',
        requests: burstRequests,
        limit: limits.burstLimit,
        timeWindow: '10 seconds',
      },
    }
  } else if (requestsLastMinute >= limits.requestsPerMinute) {
    violation = {
      type: 'rate_limit',
      crawlerType,
      ip,
      userAgent: `${crawlerType} crawler`,
      path: '',
      timestamp: currentTime,
      details: {
        limitType: 'per_minute',
        requests: requestsLastMinute,
        limit: limits.requestsPerMinute,
        timeWindow: '1 minute',
      },
    }
  } else if (requestsLastHour >= limits.requestsPerHour) {
    violation = {
      type: 'rate_limit',
      crawlerType,
      ip,
      userAgent: `${crawlerType} crawler`,
      path: '',
      timestamp: currentTime,
      details: {
        limitType: 'per_hour',
        requests: requestsLastHour,
        limit: limits.requestsPerHour,
        timeWindow: '1 hour',
      },
    }
  } else if (requestsLastDay >= limits.requestsPerDay) {
    violation = {
      type: 'rate_limit',
      crawlerType,
      ip,
      userAgent: `${crawlerType} crawler`,
      path: '',
      timestamp: currentTime,
      details: {
        limitType: 'per_day',
        requests: requestsLastDay,
        limit: limits.requestsPerDay,
        timeWindow: '24 hours',
      },
    }
  }

  // Si hay violación, registrarla
  if (violation) {
    metrics.violations.push(violation)
    violationsCache.push(violation)
    
    // Mantener solo las últimas 1000 violaciones
    if (violationsCache.length > 1000) {
      violationsCache.shift()
    }
    
    return { allowed: false, violation, metrics }
  }

  // Si no hay violación, registrar el timestamp
  timestamps.push(now)
  requestTimestamps.set(key, timestamps)

  return { allowed: true, metrics }
}

/**
 * Verifica si el modo de emergencia está activo
 */
export function checkEmergencyMode(
  crawlerType: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): boolean {
  if (!config.emergencyMode.enabled) return false
  
  return !config.emergencyMode.allowedCrawlers.includes(crawlerType)
}

/**
 * Análisis completo de seguridad para una request
 */
export function analyzeRequest(
  request: NextRequest,
  crawlerType: string,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): {
  allowed: boolean
  violations: SecurityViolation[]
  metrics?: CrawlerMetrics
} {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const currentTime = new Date().toISOString()
  
  const violations: SecurityViolation[] = []

  // 1. Verificar lista negra
  if (isBlacklisted(ip, config)) {
    violations.push({
      type: 'blacklist',
      crawlerType,
      ip,
      userAgent,
      path,
      timestamp: currentTime,
      details: { reason: 'IP in blacklist' },
    })
  }

  // 2. Verificar modo de emergencia
  if (checkEmergencyMode(crawlerType, config)) {
    violations.push({
      type: 'emergency_mode',
      crawlerType,
      ip,
      userAgent,
      path,
      timestamp: currentTime,
      details: { reason: 'Emergency mode active, crawler not in allowed list' },
    })
  }

  // 3. Detectar patrones sospechosos
  const suspiciousPattern = detectSuspiciousPattern(path, config)
  if (suspiciousPattern) {
    violations.push({
      type: 'suspicious_pattern',
      crawlerType,
      ip,
      userAgent,
      path,
      timestamp: currentTime,
      details: { pattern: suspiciousPattern },
    })
  }

  // 4. Verificar rate limiting (solo si no está en lista blanca)
  let metrics: CrawlerMetrics | undefined
  if (!isWhitelisted(ip, config)) {
    const rateLimitResult = checkRateLimit(ip, crawlerType, config)
    metrics = rateLimitResult.metrics
    
    if (!rateLimitResult.allowed && rateLimitResult.violation) {
      rateLimitResult.violation.path = path
      rateLimitResult.violation.userAgent = userAgent
      violations.push(rateLimitResult.violation)
    }
  }

  // Registrar todas las violaciones
  violations.forEach(violation => {
    violationsCache.push(violation)
  })

  return {
    allowed: violations.length === 0,
    violations,
    metrics,
  }
}

/**
 * Obtiene estadísticas de seguridad
 */
export function getSecurityStats(): {
  totalCrawlers: number
  activeCrawlers: number
  totalViolations: number
  recentViolations: SecurityViolation[]
  crawlerMetrics: CrawlerMetrics[]
  violationsByType: Record<string, number>
} {
  const now = Date.now()
  const oneHourAgo = now - (60 * 60 * 1000)
  
  // Crawlers activos en la última hora
  const activeCrawlers = Array.from(crawlerMetricsCache.values()).filter(
    metrics => new Date(metrics.lastRequest).getTime() > oneHourAgo
  ).length

  // Violaciones recientes (últimas 24 horas)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  const recentViolations = violationsCache.filter(
    violation => new Date(violation.timestamp).getTime() > oneDayAgo
  )

  // Contar violaciones por tipo
  const violationsByType: Record<string, number> = {}
  recentViolations.forEach(violation => {
    violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1
  })

  return {
    totalCrawlers: crawlerMetricsCache.size,
    activeCrawlers,
    totalViolations: violationsCache.length,
    recentViolations: recentViolations.slice(-50), // Últimas 50
    crawlerMetrics: Array.from(crawlerMetricsCache.values()),
    violationsByType,
  }
}

/**
 * Limpia datos antiguos del cache
 */
export function cleanupOldData(): void {
  const now = Date.now()
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)

  // Limpiar métricas de crawlers inactivos por más de 7 días
  for (const [key, metrics] of crawlerMetricsCache.entries()) {
    if (new Date(metrics.lastRequest).getTime() < sevenDaysAgo) {
      crawlerMetricsCache.delete(key)
      requestTimestamps.delete(key)
    }
  }

  // Limpiar violaciones antiguas (mantener solo las últimas 1000)
  if (violationsCache.length > 1000) {
    violationsCache.splice(0, violationsCache.length - 1000)
  }
}

/**
 * Actualiza la configuración de seguridad
 */
export function updateSecurityConfig(newConfig: Partial<SecurityConfig>): SecurityConfig {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...newConfig,
  }
}

// Exportar configuración por defecto
export { DEFAULT_SECURITY_CONFIG as defaultSecurityConfig }
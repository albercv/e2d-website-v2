import { getCrawlerStats, CrawlerStats } from './ai-crawler-logger'

// Tipos para el sistema de monitoreo
export interface CrawlerHealthCheck {
  crawlerType: string
  url: string
  timestamp: string
  success: boolean
  statusCode?: number
  responseTime?: number
  error?: string
}

export interface CrawlerAlert {
  type: 'error' | 'warning' | 'info'
  crawlerType: string
  message: string
  timestamp: string
  details?: any
}

export interface MonitoringConfig {
  checkInterval: number // minutos
  alertThresholds: {
    maxResponseTime: number // ms
    minSuccessRate: number // porcentaje
    maxErrorsPerHour: number
  }
  testUrls: {
    crawlerType: string
    urls: string[]
  }[]
  webhookUrl?: string // Para notificaciones externas
}

// Configuración por defecto del monitoreo
const DEFAULT_CONFIG: MonitoringConfig = {
  checkInterval: 30, // 30 minutos
  alertThresholds: {
    maxResponseTime: 5000, // 5 segundos
    minSuccessRate: 95, // 95%
    maxErrorsPerHour: 10,
  },
  testUrls: [
    {
      crawlerType: 'GPTBot',
      urls: [
        'https://evolve2digital.com/es',
        'https://evolve2digital.com/es/blog',
        'https://evolve2digital.com/sitemap.xml',
      ],
    },
    {
      crawlerType: 'Google-Extended',
      urls: [
        'https://evolve2digital.com/es',
        'https://evolve2digital.com/es/blog',
        'https://evolve2digital.com/sitemap.xml',
      ],
    },
    {
      crawlerType: 'ClaudeBot',
      urls: [
        'https://evolve2digital.com/es',
        'https://evolve2digital.com/es/blog',
        'https://evolve2digital.com/sitemap.xml',
      ],
    },
  ],
}

// Cache para almacenar resultados de health checks
const healthCheckCache = new Map<string, CrawlerHealthCheck[]>()
const alertsCache: CrawlerAlert[] = []

/**
 * Realiza un health check para un crawler específico
 */
export async function performHealthCheck(
  crawlerType: string,
  url: string
): Promise<CrawlerHealthCheck> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': getUserAgentForCrawler(crawlerType),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime
    const success = response.ok

    return {
      crawlerType,
      url,
      timestamp,
      success,
      statusCode: response.status,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      crawlerType,
      url,
      timestamp,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Obtiene el User-Agent apropiado para cada tipo de crawler
 */
function getUserAgentForCrawler(crawlerType: string): string {
  const userAgents = {
    'GPTBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot',
    'Google-Extended': 'Mozilla/5.0 (compatible; Google-Extended/1.0; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)',
    'ClaudeBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com',
    'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    'Bingbot': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  }

  return userAgents[crawlerType as keyof typeof userAgents] || userAgents['GPTBot']
}

/**
 * Ejecuta health checks para todos los crawlers configurados
 */
export async function runAllHealthChecks(
  config: MonitoringConfig = DEFAULT_CONFIG
): Promise<CrawlerHealthCheck[]> {
  const results: CrawlerHealthCheck[] = []

  for (const testConfig of config.testUrls) {
    for (const url of testConfig.urls) {
      try {
        const result = await performHealthCheck(testConfig.crawlerType, url)
        results.push(result)
        
        // Almacenar en cache
        const key = testConfig.crawlerType
        if (!healthCheckCache.has(key)) {
          healthCheckCache.set(key, [])
        }
        
        const checks = healthCheckCache.get(key)!
        checks.push(result)
        
        // Mantener solo los últimos 100 checks por crawler
        if (checks.length > 100) {
          checks.shift()
        }
      } catch (error) {
        console.error(`Error in health check for ${testConfig.crawlerType}:`, error)
      }
    }
  }

  return results
}

/**
 * Analiza los resultados de health checks y genera alertas
 */
export function analyzeHealthChecks(
  results: CrawlerHealthCheck[],
  config: MonitoringConfig = DEFAULT_CONFIG
): CrawlerAlert[] {
  const alerts: CrawlerAlert[] = []
  const crawlerGroups = groupBy(results, 'crawlerType')

  for (const [crawlerType, checks] of Object.entries(crawlerGroups)) {
    const successfulChecks = checks.filter(c => c.success)
    const failedChecks = checks.filter(c => !c.success)
    const successRate = (successfulChecks.length / checks.length) * 100

    // Alerta por baja tasa de éxito
    if (successRate < config.alertThresholds.minSuccessRate) {
      alerts.push({
        type: 'error',
        crawlerType,
        message: `Low success rate: ${successRate.toFixed(1)}% (threshold: ${config.alertThresholds.minSuccessRate}%)`,
        timestamp: new Date().toISOString(),
        details: {
          successfulChecks: successfulChecks.length,
          totalChecks: checks.length,
          failedUrls: failedChecks.map(c => c.url),
        },
      })
    }

    // Alerta por tiempo de respuesta alto
    const avgResponseTime = successfulChecks.reduce((sum, c) => sum + (c.responseTime || 0), 0) / successfulChecks.length
    if (avgResponseTime > config.alertThresholds.maxResponseTime) {
      alerts.push({
        type: 'warning',
        crawlerType,
        message: `High response time: ${avgResponseTime.toFixed(0)}ms (threshold: ${config.alertThresholds.maxResponseTime}ms)`,
        timestamp: new Date().toISOString(),
        details: {
          averageResponseTime: avgResponseTime,
          slowestUrl: successfulChecks.reduce((slowest, current) => 
            (current.responseTime || 0) > (slowest.responseTime || 0) ? current : slowest
          ),
        },
      })
    }

    // Alerta por errores específicos
    const recentErrors = failedChecks.filter(c => {
      const checkTime = new Date(c.timestamp).getTime()
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      return checkTime > oneHourAgo
    })

    if (recentErrors.length > config.alertThresholds.maxErrorsPerHour) {
      alerts.push({
        type: 'error',
        crawlerType,
        message: `Too many errors in the last hour: ${recentErrors.length} (threshold: ${config.alertThresholds.maxErrorsPerHour})`,
        timestamp: new Date().toISOString(),
        details: {
          recentErrors: recentErrors.map(e => ({
            url: e.url,
            error: e.error,
            timestamp: e.timestamp,
          })),
        },
      })
    }
  }

  // Almacenar alertas en cache
  alertsCache.push(...alerts)
  
  // Mantener solo las últimas 1000 alertas
  if (alertsCache.length > 1000) {
    alertsCache.splice(0, alertsCache.length - 1000)
  }

  return alerts
}

/**
 * Obtiene estadísticas de salud de los crawlers
 */
export async function getCrawlerHealthStats(): Promise<{
  healthChecks: Record<string, CrawlerHealthCheck[]>
  recentAlerts: CrawlerAlert[]
  crawlerStats: CrawlerStats
}> {
  const healthChecks: Record<string, CrawlerHealthCheck[]> = {}
  
  for (const [crawlerType, checks] of healthCheckCache.entries()) {
    healthChecks[crawlerType] = checks.slice(-10) // Últimos 10 checks
  }

  const recentAlerts = alertsCache.slice(-50) // Últimas 50 alertas
  const crawlerStats = await getCrawlerStats()

  return {
    healthChecks,
    recentAlerts,
    crawlerStats,
  }
}

/**
 * Envía notificaciones de alertas (webhook, email, etc.)
 */
export async function sendAlertNotifications(
  alerts: CrawlerAlert[],
  webhookUrl?: string
): Promise<void> {
  if (!webhookUrl || alerts.length === 0) return

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      service: 'AI Crawler Monitor',
      alerts: alerts.map(alert => ({
        type: alert.type,
        crawler: alert.crawlerType,
        message: alert.message,
        timestamp: alert.timestamp,
      })),
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log(`Sent ${alerts.length} alerts to webhook`)
  } catch (error) {
    console.error('Error sending alert notifications:', error)
  }
}

/**
 * Función principal de monitoreo que se puede ejecutar periódicamente
 */
export async function runMonitoringCycle(
  config: MonitoringConfig = DEFAULT_CONFIG
): Promise<{
  healthChecks: CrawlerHealthCheck[]
  alerts: CrawlerAlert[]
}> {
  console.log('Starting AI crawler monitoring cycle...')
  
  const healthChecks = await runAllHealthChecks(config)
  const alerts = analyzeHealthChecks(healthChecks, config)
  
  if (alerts.length > 0) {
    console.log(`Generated ${alerts.length} alerts:`)
    alerts.forEach(alert => {
      console.log(`[${alert.type.toUpperCase()}] ${alert.crawlerType}: ${alert.message}`)
    })
    
    await sendAlertNotifications(alerts, config.webhookUrl)
  }
  
  console.log(`Monitoring cycle completed. Checked ${healthChecks.length} URLs, generated ${alerts.length} alerts.`)
  
  return { healthChecks, alerts }
}

// Utilidad para agrupar arrays por una propiedad
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

// Exportar configuración por defecto para uso externo
export { DEFAULT_CONFIG as defaultMonitoringConfig }
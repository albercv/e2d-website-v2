import { NextRequest } from 'next/server'
import fs from 'fs/promises'

// Tipos para el sistema de logging
export interface CrawlerLogEntry {
  timestamp: string
  userAgent: string
  crawlerType: 'GPTBot' | 'Google-Extended' | 'ClaudeBot' | 'ChatGPT-User' | 'Bingbot' | 'Unknown'
  url: string
  method: string
  statusCode?: number
  responseTime?: number
  ip?: string
  referer?: string
  contentLength?: number
}

export interface CrawlerStats {
  totalRequests: number
  uniqueUrls: number
  crawlerBreakdown: Record<string, number>
  lastActivity: string
  averageResponseTime: number
}

// User agents de crawlers IA conocidos
const AI_CRAWLERS = {
  'GPTBot': /GPTBot/i,
  'Google-Extended': /Google-Extended/i,
  'ClaudeBot': /ClaudeBot/i,
  'ChatGPT-User': /ChatGPT-User/i,
  'Bingbot': /bingbot/i,
} as const

// Configuración de logging
const LOG_CONFIG = {
  logDir: '/tmp/logs/ai-crawlers', // Use /tmp for edge runtime compatibility
  maxLogSize: 10 * 1024 * 1024, // 10MB
  retentionDays: 30,
  enableConsoleLog: process.env.NODE_ENV === 'development',
}

/**
 * Identifica el tipo de crawler basado en el User-Agent
 */
export function identifyCrawler(userAgent: string): CrawlerLogEntry['crawlerType'] {
  for (const [crawlerType, pattern] of Object.entries(AI_CRAWLERS)) {
    if (pattern.test(userAgent)) {
      return crawlerType as CrawlerLogEntry['crawlerType']
    }
  }
  return 'Unknown'
}

/**
 * Verifica si una request proviene de un crawler IA
 */
export function isAICrawler(userAgent: string): boolean {
  return Object.values(AI_CRAWLERS).some(pattern => pattern.test(userAgent))
}

/**
 * Crea una entrada de log para un crawler IA
 */
export function createLogEntry(
  request: NextRequest,
  statusCode?: number,
  responseTime?: number
): CrawlerLogEntry {
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const crawlerType = identifyCrawler(userAgent)
  
  return {
    timestamp: new Date().toISOString(),
    userAgent,
    crawlerType,
    url: request.url,
    method: request.method,
    statusCode,
    responseTime,
    ip: request.ip || request.headers.get('x-forwarded-for') || 'Unknown',
    referer: request.headers.get('referer') || undefined,
    contentLength: request.headers.get('content-length') 
      ? parseInt(request.headers.get('content-length')!) 
      : undefined,
  }
}

/**
 * Asegura que el directorio de logs existe
 */
async function ensureLogDirectory(): Promise<void> {
  try {
    await fs.access(LOG_CONFIG.logDir)
  } catch {
    await fs.mkdir(LOG_CONFIG.logDir, { recursive: true })
  }
}

/**
 * Obtiene el nombre del archivo de log para la fecha actual
 */
function getLogFileName(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `ai-crawlers-${dateStr}.jsonl`
}

/**
 * Escribe una entrada de log al archivo
 */
export async function writeLogEntry(logEntry: CrawlerLogEntry): Promise<void> {
  try {
    await ensureLogDirectory()
    
    const logFileName = getLogFileName()
    const logFilePath = `${LOG_CONFIG.logDir}/${logFileName}`
    
    const logLine = JSON.stringify(logEntry) + '\n'
    
    await fs.appendFile(logFilePath, logLine, 'utf8')
    
    if (LOG_CONFIG.enableConsoleLog) {
      console.log(`[AI Crawler] ${logEntry.crawlerType} - ${logEntry.url}`)
    }
  } catch (error) {
    console.error('Error writing crawler log:', error)
  }
}

/**
 * Lee las entradas de log de un día específico
 */
export async function readLogEntries(date: Date = new Date()): Promise<CrawlerLogEntry[]> {
  try {
    const logFileName = getLogFileName(date)
    const logFilePath = `${LOG_CONFIG.logDir}/${logFileName}`
    
    const content = await fs.readFile(logFilePath, 'utf8')
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return [] // Archivo no existe, retornar array vacío
    }
    throw error
  }
}

/**
 * Obtiene estadísticas de crawling para un rango de fechas
 */
export async function getCrawlerStats(
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
  endDate: Date = new Date()
): Promise<CrawlerStats> {
  const stats: CrawlerStats = {
    totalRequests: 0,
    uniqueUrls: 0,
    crawlerBreakdown: {},
    lastActivity: '',
    averageResponseTime: 0,
  }
  
  const uniqueUrls = new Set<string>()
  let totalResponseTime = 0
  let responseTimeCount = 0
  let latestTimestamp = ''
  
  // Iterar por cada día en el rango
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    try {
      const entries = await readLogEntries(currentDate)
      
      for (const entry of entries) {
        stats.totalRequests++
        uniqueUrls.add(entry.url)
        
        // Contar por tipo de crawler
        stats.crawlerBreakdown[entry.crawlerType] = 
          (stats.crawlerBreakdown[entry.crawlerType] || 0) + 1
        
        // Calcular tiempo de respuesta promedio
        if (entry.responseTime) {
          totalResponseTime += entry.responseTime
          responseTimeCount++
        }
        
        // Encontrar la actividad más reciente
        if (entry.timestamp > latestTimestamp) {
          latestTimestamp = entry.timestamp
        }
      }
    } catch (error) {
      // Ignorar errores de archivos no encontrados
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  stats.uniqueUrls = uniqueUrls.size
  stats.lastActivity = latestTimestamp
  stats.averageResponseTime = responseTimeCount > 0 
    ? totalResponseTime / responseTimeCount 
    : 0
  
  return stats
}

/**
 * Limpia logs antiguos basado en la configuración de retención
 */
export async function cleanupOldLogs(): Promise<void> {
  try {
    await ensureLogDirectory()
    
    const files = await fs.readdir(LOG_CONFIG.logDir)
    const cutoffDate = new Date(Date.now() - LOG_CONFIG.retentionDays * 24 * 60 * 60 * 1000)
    
    for (const file of files) {
      if (file.startsWith('ai-crawlers-') && file.endsWith('.jsonl')) {
        const dateMatch = file.match(/ai-crawlers-(\d{4}-\d{2}-\d{2})\.jsonl/)
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1])
          if (fileDate < cutoffDate) {
            await fs.unlink(`${LOG_CONFIG.logDir}/${file}`)
            console.log(`Deleted old log file: ${file}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old logs:', error)
  }
}

/**
 * Middleware helper para logging automático
 */
export async function logCrawlerRequest(
  request: NextRequest,
  statusCode: number,
  responseTime: number
): Promise<void> {
  const userAgent = request.headers.get('user-agent') || ''
  
  if (isAICrawler(userAgent)) {
    const logEntry = createLogEntry(request, statusCode, responseTime)
    await writeLogEntry(logEntry)
  }
}
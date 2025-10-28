/**
 * MCP Logger Service
 * 
 * Sistema de logging y monitorización para el sistema MCP integrado.
 * Registra consultas, errores, rendimiento y estadísticas de uso.
 * 
 * @module MCPLogger
 * @version 1.0.0
 */

/**
 * Tipos de eventos MCP
 */
export type MCPEventType = 
  | 'tool_invocation'
  | 'manifest_request'
  | 'error'
  | 'rate_limit_exceeded'
  | 'validation_failed'
  | 'success'
  | 'performance_warning'

/**
 * Niveles de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Estructura de entrada de log
 */
export interface MCPLogEntry {
  timestamp: string
  eventType: MCPEventType
  level: LogLevel
  tool?: string
  endpoint: string
  method: string
  userAgent?: string
  ip?: string
  query?: string
  processingTime?: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
  responseSize?: number
  statusCode: number
}

/**
 * Estadísticas de uso
 */
export interface MCPStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageProcessingTime: number
  toolUsage: Record<string, number>
  errorTypes: Record<string, number>
  dailyRequests: Record<string, number>
  topUserAgents: Record<string, number>
  performanceMetrics: {
    p50: number
    p95: number
    p99: number
  }
}

/**
 * Configuración del logger
 */
interface MCPLoggerConfig {
  enabled: boolean
  logLevel: LogLevel
  maxLogEntries: number
  retentionDays: number
  enablePerformanceTracking: boolean
  enableErrorNotifications: boolean
  notificationThreshold: number
}

/**
 * Clase principal del logger MCP
 */
export class MCPLogger {
  private static instance: MCPLogger
  private logs: MCPLogEntry[] = []
  private config: MCPLoggerConfig
  private stats: MCPStats
  
  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV !== 'test',
      logLevel: (process.env.MCP_LOG_LEVEL as LogLevel) || 'info',
      maxLogEntries: parseInt(process.env.MCP_MAX_LOG_ENTRIES || '10000'),
      retentionDays: parseInt(process.env.MCP_LOG_RETENTION_DAYS || '30'),
      enablePerformanceTracking: process.env.MCP_PERFORMANCE_TRACKING !== 'false',
      enableErrorNotifications: process.env.MCP_ERROR_NOTIFICATIONS === 'true',
      notificationThreshold: parseInt(process.env.MCP_ERROR_THRESHOLD || '10')
    }
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      toolUsage: {},
      errorTypes: {},
      dailyRequests: {},
      topUserAgents: {},
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0
      }
    }
    
    // Limpiar logs antiguos cada hora
    if (typeof window === 'undefined') { // Solo en servidor
      setInterval(() => this.cleanupOldLogs(), 60 * 60 * 1000)
    }
  }
  
  /**
   * Obtiene la instancia singleton del logger
   */
  public static getInstance(): MCPLogger {
    if (!MCPLogger.instance) {
      MCPLogger.instance = new MCPLogger()
    }
    return MCPLogger.instance
  }
  
  /**
   * Registra un evento MCP
   */
  public log(entry: Omit<MCPLogEntry, 'timestamp'>): void {
    if (!this.config.enabled) return
    
    const logEntry: MCPLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    }
    
    // Verificar nivel de log
    if (!this.shouldLog(entry.level)) return
    
    // Agregar a logs
    this.logs.push(logEntry)
    
    // Actualizar estadísticas
    this.updateStats(logEntry)
    
    // Log a consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry)
    }
    
    // Limpiar logs si excede el máximo
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries)
    }
    
    // Verificar si necesita notificación de error
    if (entry.level === 'error' && this.config.enableErrorNotifications) {
      this.checkErrorThreshold()
    }
  }
  
  /**
   * Registra invocación de herramienta
   */
  public logToolInvocation(
    tool: string,
    endpoint: string,
    method: string,
    success: boolean,
    processingTime: number,
    statusCode: number,
    userAgent?: string,
    query?: string,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      eventType: 'tool_invocation',
      level: success ? 'info' : 'error',
      tool,
      endpoint,
      method,
      userAgent,
      query,
      processingTime,
      success,
      error,
      metadata,
      statusCode
    })
  }
  
  /**
   * Registra solicitud de manifest
   */
  public logManifestRequest(
    endpoint: string,
    method: string,
    success: boolean,
    processingTime: number,
    statusCode: number,
    userAgent?: string
  ): void {
    this.log({
      eventType: 'manifest_request',
      level: 'info',
      endpoint,
      method,
      userAgent,
      processingTime,
      success,
      statusCode
    })
  }
  
  /**
   * Registra error
   */
  public logError(
    endpoint: string,
    method: string,
    error: string,
    statusCode: number,
    userAgent?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      eventType: 'error',
      level: 'error',
      endpoint,
      method,
      userAgent,
      success: false,
      error,
      metadata,
      statusCode
    })
  }
  
  /**
   * Registra exceso de rate limit
   */
  public logRateLimitExceeded(
    endpoint: string,
    userAgent?: string,
    ip?: string
  ): void {
    this.log({
      eventType: 'rate_limit_exceeded',
      level: 'warn',
      endpoint,
      method: 'ANY',
      userAgent,
      ip,
      success: false,
      statusCode: 429
    })
  }
  
  /**
   * Obtiene estadísticas actuales
   */
  public getStats(): MCPStats {
    return { ...this.stats }
  }
  
  /**
   * Obtiene logs recientes
   */
  public getRecentLogs(limit: number = 100): MCPLogEntry[] {
    return this.logs.slice(-limit)
  }
  
  /**
   * Obtiene logs filtrados
   */
  public getFilteredLogs(filters: {
    eventType?: MCPEventType
    level?: LogLevel
    tool?: string
    success?: boolean
    startDate?: Date
    endDate?: Date
  }): MCPLogEntry[] {
    return this.logs.filter(log => {
      if (filters.eventType && log.eventType !== filters.eventType) return false
      if (filters.level && log.level !== filters.level) return false
      if (filters.tool && log.tool !== filters.tool) return false
      if (filters.success !== undefined && log.success !== filters.success) return false
      if (filters.startDate && new Date(log.timestamp) < filters.startDate) return false
      if (filters.endDate && new Date(log.timestamp) > filters.endDate) return false
      return true
    })
  }
  
  /**
   * Exporta logs en formato JSON
   */
  public exportLogs(filters?: Parameters<typeof this.getFilteredLogs>[0]): string {
    const logs = filters ? this.getFilteredLogs(filters) : this.logs
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      stats: this.stats,
      logs
    }, null, 2)
  }
  
  /**
   * Limpia logs antiguos
   */
  private cleanupOldLogs(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)
    
    const initialCount = this.logs.length
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    )
    
    const removedCount = initialCount - this.logs.length
    if (removedCount > 0) {
      console.log(`MCP Logger: Cleaned up ${removedCount} old log entries`)
    }
  }
  
  /**
   * Verifica si debe registrar según el nivel
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const configLevelIndex = levels.indexOf(this.config.logLevel)
    const entryLevelIndex = levels.indexOf(level)
    return entryLevelIndex >= configLevelIndex
  }
  
  /**
   * Actualiza estadísticas
   */
  private updateStats(entry: MCPLogEntry): void {
    this.stats.totalRequests++
    
    if (entry.success) {
      this.stats.successfulRequests++
    } else {
      this.stats.failedRequests++
    }
    
    // Actualizar tiempo promedio de procesamiento
    if (entry.processingTime) {
      const total = this.stats.averageProcessingTime * (this.stats.totalRequests - 1)
      this.stats.averageProcessingTime = (total + entry.processingTime) / this.stats.totalRequests
    }
    
    // Actualizar uso de herramientas
    if (entry.tool) {
      this.stats.toolUsage[entry.tool] = (this.stats.toolUsage[entry.tool] || 0) + 1
    }
    
    // Actualizar tipos de error
    if (entry.error) {
      const errorType = entry.eventType
      this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1
    }
    
    // Actualizar solicitudes diarias
    const dateKey = entry.timestamp.split('T')[0]
    this.stats.dailyRequests[dateKey] = (this.stats.dailyRequests[dateKey] || 0) + 1
    
    // Actualizar user agents
    if (entry.userAgent) {
      const ua = this.extractUserAgentType(entry.userAgent)
      this.stats.topUserAgents[ua] = (this.stats.topUserAgents[ua] || 0) + 1
    }
    
    // Actualizar métricas de rendimiento
    if (this.config.enablePerformanceTracking) {
      this.updatePerformanceMetrics()
    }
  }
  
  /**
   * Actualiza métricas de rendimiento
   */
  private updatePerformanceMetrics(): void {
    const processingTimes = this.logs
      .filter(log => log.processingTime)
      .map(log => log.processingTime!)
      .sort((a, b) => a - b)
    
    if (processingTimes.length === 0) return
    
    const p50Index = Math.floor(processingTimes.length * 0.5)
    const p95Index = Math.floor(processingTimes.length * 0.95)
    const p99Index = Math.floor(processingTimes.length * 0.99)
    
    this.stats.performanceMetrics = {
      p50: processingTimes[p50Index] || 0,
      p95: processingTimes[p95Index] || 0,
      p99: processingTimes[p99Index] || 0
    }
  }
  
  /**
   * Extrae tipo de user agent
   */
  private extractUserAgentType(userAgent: string): string {
    if (userAgent.includes('ChatGPT')) return 'ChatGPT'
    if (userAgent.includes('Claude')) return 'Claude'
    if (userAgent.includes('GPT')) return 'GPT'
    if (userAgent.includes('Gemini')) return 'Gemini'
    if (userAgent.includes('curl')) return 'curl'
    if (userAgent.includes('Postman')) return 'Postman'
    if (userAgent.includes('Mozilla')) return 'Browser'
    return 'Other'
  }
  
  /**
   * Log a consola
   */
  private logToConsole(entry: MCPLogEntry): void {
    const prefix = `[MCP ${entry.level.toUpperCase()}]`
    const message = `${prefix} ${entry.eventType} - ${entry.endpoint} (${entry.statusCode})`
    
    switch (entry.level) {
      case 'error':
        console.error(message, entry.error || '')
        break
      case 'warn':
        console.warn(message)
        break
      case 'debug':
        console.debug(message, entry.metadata || '')
        break
      default:
        console.log(message)
    }
  }
  
  /**
   * Verifica umbral de errores para notificaciones
   */
  private checkErrorThreshold(): void {
    const recentErrors = this.logs
      .filter(log => {
        const logTime = new Date(log.timestamp)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        return log.level === 'error' && logTime > oneHourAgo
      })
    
    if (recentErrors.length >= this.config.notificationThreshold) {
      console.error(`MCP Logger: Error threshold exceeded (${recentErrors.length} errors in the last hour)`)
      // Aquí se podría integrar con n8n o sistema de notificaciones
    }
  }
}

/**
 * Instancia singleton del logger
 */
export const mcpLogger = MCPLogger.getInstance()

/**
 * Middleware helper para logging automático
 */
export function createMCPLoggerMiddleware() {
  return {
    /**
     * Log antes de procesar request
     */
    logRequest: (
      tool: string,
      endpoint: string,
      method: string,
      userAgent?: string,
      query?: string
    ) => {
      return {
        startTime: Date.now(),
        log: (success: boolean, statusCode: number, error?: string, metadata?: Record<string, any>) => {
          const processingTime = Date.now() - Date.now()
          mcpLogger.logToolInvocation(
            tool,
            endpoint,
            method,
            success,
            processingTime,
            statusCode,
            userAgent,
            query,
            error,
            metadata
          )
        }
      }
    }
  }
}
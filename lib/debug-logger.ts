/**
 * Sistema de Debug Logger para diagnosticar problemas de recarga constante
 * 
 * Proporciona logging estructurado para:
 * - Montaje/desmontaje de componentes
 * - Cambios de estado
 * - Eventos de Fast Refresh
 * - Errores de hidratación
 * - Bucles de renderizado
 */

export interface LogEvent {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'component' | 'hmr' | 'hydration' | 'render' | 'file-change' | 'performance' | 'debug'
  message: string
  data?: Record<string, any>
  stack?: string
}

class DebugLogger {
  private logs: LogEvent[] = []
  private maxLogs = 1000
  private isEnabled = process.env.NODE_ENV === 'development'

  constructor() {
    if (typeof window !== 'undefined' && this.isEnabled) {
      // Capturar errores de hidratación
      window.addEventListener('error', this.handleError.bind(this))
      window.addEventListener('unhandledrejection', this.handleRejection.bind(this))
      
      // Monitorear cambios en el DOM que pueden indicar recargas
      this.setupDOMObserver()
      
      // Exponer logger en window para debugging manual
      ;(window as any).__debugLogger = this
    }
  }

  private createLogEvent(
    level: LogEvent['level'],
    category: LogEvent['category'],
    message: string,
    data?: Record<string, any>
  ): LogEvent {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack: level === 'error' ? new Error().stack : undefined
    }
  }

  private addLog(event: LogEvent) {
    if (!this.isEnabled) return

    this.logs.push(event)
    
    // Mantener solo los últimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output con colores
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[90m'    // Gray
    }
    
    const reset = '\x1b[0m'
    const color = colors[event.level]
    
    console.log(
      `${color}[${event.level.toUpperCase()}]${reset} ` +
      `${color}[${event.category}]${reset} ` +
      `${event.message}`,
      event.data ? event.data : ''
    )
  }

  // Métodos públicos de logging
  info(category: LogEvent['category'], message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEvent('info', category, message, data))
  }

  warn(category: LogEvent['category'], message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEvent('warn', category, message, data))
  }

  error(category: LogEvent['category'], message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEvent('error', category, message, data))
  }

  debug(category: LogEvent['category'], message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEvent('debug', category, message, data))
  }

  // Métodos especializados
  componentMount(componentName: string, props?: Record<string, any>) {
    this.info('component', `Component mounted: ${componentName}`, { props })
  }

  componentUnmount(componentName: string) {
    this.info('component', `Component unmounted: ${componentName}`)
  }

  componentRender(componentName: string, renderCount?: number) {
    this.debug('render', `Component rendered: ${componentName}`, { renderCount })
  }

  hmrEvent(type: string, modules?: string[]) {
    this.warn('hmr', `HMR Event: ${type}`, { modules })
  }

  hydrationMismatch(componentName: string, details?: Record<string, any>) {
    this.error('hydration', `Hydration mismatch in: ${componentName}`, details)
  }

  performanceIssue(metric: string, value: number, threshold: number) {
    this.warn('performance', `Performance issue: ${metric}`, { value, threshold })
  }

  // Event handlers
  private handleError(event: ErrorEvent) {
    this.error('component', `Runtime error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    })
  }

  private handleRejection(event: PromiseRejectionEvent) {
    this.error('component', `Unhandled promise rejection`, {
      reason: event.reason,
      stack: event.reason?.stack
    })
  }

  private setupDOMObserver() {
    if (typeof window === 'undefined') return

    let reloadCount = 0
    const observer = new MutationObserver((mutations) => {
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName !== 'SCRIPT'
        )
      )

      if (hasSignificantChanges) {
        reloadCount++
        if (reloadCount > 5) {
          this.warn('render', `Possible reload loop detected`, { reloadCount })
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Reset counter periodically
    setInterval(() => {
      reloadCount = 0
    }, 5000)
  }

  // Utilidades para análisis
  getLogs(category?: LogEvent['category'], level?: LogEvent['level']): LogEvent[] {
    return this.logs.filter(log => 
      (!category || log.category === category) &&
      (!level || log.level === level)
    )
  }

  getLogsSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      recentErrors: this.logs.filter(log => log.level === 'error').slice(-5)
    }

    this.logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1
    })

    return summary
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  clearLogs() {
    this.logs = []
    console.log('🧹 Debug logs cleared')
  }
}

// Singleton instance
export const debugLogger = new DebugLogger()

// Hook para usar en componentes React
export function useDebugLogger(componentName: string) {
  if (typeof window === 'undefined') return debugLogger

  const renderCount = React.useRef(0)
  
  React.useEffect(() => {
    renderCount.current++
    debugLogger.componentMount(componentName)
    debugLogger.componentRender(componentName, renderCount.current)
    
    return () => {
      debugLogger.componentUnmount(componentName)
    }
  }, [componentName])

  React.useEffect(() => {
    debugLogger.componentRender(componentName, renderCount.current)
  })

  return debugLogger
}

// Importar React solo si está disponible
let React: any
try {
  React = require('react')
} catch {
  // React no disponible en el servidor
}
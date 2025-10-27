/* Debug Logger - structured logging and diagnostics */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'component' | 'hmr' | 'hydration' | 'render' | 'performance' | 'debug'

interface LogEvent {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  data?: Record<string, any>
}

class DebugLogger {
  private logs: LogEvent[] = []
  private renderLoopCount = 0
  private lastRenderLoopTime = 0
  
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
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
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
    
    // Suppress interception to avoid recursive logging when debug-initializer intercepts console.log
    if (typeof window !== 'undefined') {
      ;(window as any).__suppressConsoleInterception = true
    }
    try {
      console.log(
        `${color}[${event.level.toUpperCase()}]${reset} ` +
        `${color}[${event.category}]${reset} ` +
        `${event.message}`,
        event.data ? event.data : ''
      )
    } finally {
      if (typeof window !== 'undefined') {
        ;(window as any).__suppressConsoleInterception = false
      }
    }
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
    // Suppress interception to avoid recursive logging when debug-initializer intercepts console.log
    if (typeof window !== 'undefined') {
      ;(window as any).__suppressConsoleInterception = true
    }
    try {
      console.log('🧹 Debug logs cleared')
    } finally {
      if (typeof window !== 'undefined') {
        ;(window as any).__suppressConsoleInterception = false
      }
    }
  }
}

export const debugLogger = new DebugLogger()

export function useDebugLogger(componentName: string) {
  // Simple helper hook for React components
  return {
    logRender: () => debugLogger.debug('component', `${componentName} rendered`),
    logMount: () => debugLogger.info('component', `${componentName} mounted`),
    logUnmount: () => debugLogger.info('component', `${componentName} unmounted`),
    logError: (error: Error) => debugLogger.error('component', `${componentName} error: ${error.message}`)
  }
}
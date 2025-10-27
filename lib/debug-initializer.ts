/**
 * Debug System Initializer
 * 
 * Inicializa y coordina todos los sistemas de debug para diagnosticar
 * problemas de recarga constante en el proyecto.
 */

import { debugLogger } from './debug-logger'
import { componentDebugLogger } from './component-debug-logger'
import { fileWatcherDebug } from './file-watcher-debug'
import { performanceMonitor } from './performance-monitor'

class DebugInitializer {
  private isInitialized = false
  private isEnabled = process.env.NODE_ENV === 'development'

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initialize()
    }
  }

  initialize() {
    if (typeof window === 'undefined') return

    debugLogger.info('debug', 'Inicializando sistemas de debug...')

    // 1. Inicializar logging global
    this.setupGlobalLogging()

    // 2. Inicializar monitor de performance
    this.setupPerformanceMonitoring()

    // 3. Inicializar detección de cambios de estado
    this.setupStateChangeDetection()

    // 4. Configurar comandos de consola
    this.setupDebugCommands()

    // 5. Inicializar reporte automático
    this.setupAutomaticReporting()

    debugLogger.info('debug', 'Sistemas de debug inicializados correctamente')
  }

  private setupGlobalLogging() {
    // Interceptar console.log para detectar mensajes de Next.js
    const originalLog = console.log
    console.log = (...args) => {
      // Skip interception for our own debug logger outputs to avoid recursion
      if (typeof window !== 'undefined' && (window as any).__suppressConsoleInterception) {
        return originalLog.apply(console, args)
      }

      const message = args.join(' ')
      
      // Detectar mensajes específicos de Next.js
      if (message.includes('compiled') || message.includes('Compiled')) {
        debugLogger.info('hmr', 'Next.js compilation completed', { message })
      }
      
      if (message.includes('Fast Refresh') || message.includes('[HMR]')) {
        debugLogger.warn('hmr', 'Hot Module Replacement event', { message })
      }
      
      if (message.includes('Error') || message.includes('error')) {
        debugLogger.error('component', 'Console error detected', { message })
      }
      
      return originalLog.apply(console, args)
    }

    // Interceptar fetch para detectar requests inesperados
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'unknown'
      
      debugLogger.debug('performance', 'Fetch request initiated', { url })
      
      try {
        const response = await originalFetch.apply(window, args)
        debugLogger.debug('performance', 'Fetch request completed', { 
          url, 
          status: response.status 
        })
        return response
      } catch (error) {
        debugLogger.error('performance', 'Fetch request failed', { 
          url, 
          error: (error as Error).message 
        })
        throw error
      }
    }
  }

  private setupPerformanceMonitoring() {
    // Inicializar el monitor de performance
    performanceMonitor.startMonitoring()
    
    // Monitorear métricas de performance
    if ('PerformanceObserver' in window) {
      try {
        // Monitorear Long Tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tareas que toman más de 50ms
              debugLogger.warn('performance', 'Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              })
            }
          })
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })

        // Monitorear Layout Shifts
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.value > 0.1) { // CLS threshold
              debugLogger.warn('performance', 'Layout shift detected', {
                value: entry.value,
                sources: entry.sources?.map((s: any) => s.node)
              })
            }
          })
        })
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })

      } catch (error) {
        debugLogger.error('debug', 'Failed to setup performance monitoring', { error })
      }
    }

    // Dev-only memory monitoring configuration (menos sensible)
    let lastMemoryWarnAt = 0
    let prevUsedMB = 0
    const MEMORY_WARN_THRESHOLD_MB = 200 // subir umbral para reducir falsos positivos en dev
    const MEMORY_WARN_COOLDOWN_MS = 120000 // 2 minutos entre avisos

    // Monitorear uso de memoria
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
        }

        const now = Date.now()
        const isRising = memoryUsage.used >= prevUsedMB
        const cooldownPassed = now - lastMemoryWarnAt > MEMORY_WARN_COOLDOWN_MS

        // Alertar solo si supera umbral, está en tendencia ascendente y respetamos cooldown
        if (memoryUsage.used > MEMORY_WARN_THRESHOLD_MB && isRising && cooldownPassed) {
          debugLogger.warn('performance', 'High memory usage detected', memoryUsage)
          lastMemoryWarnAt = now
        }

        prevUsedMB = memoryUsage.used
      }
    }, 30000) // Cada 30 segundos
  }

  private setupStateChangeDetection() {
    // Detectar cambios en el DOM que pueden indicar re-renders
    let lastDOMChangeTime = Date.now()
    let domChangeCount = 0

    const observer = new MutationObserver((mutations) => {
      // Filtrar cambios significativos (evitar atributos/estilos, scripts y estilos)
      const significantChange = mutations.some((mutation) => {
        if (mutation.type !== 'childList') return false
        if (!mutation.addedNodes || mutation.addedNodes.length === 0) return false
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false
          const tag = (node as Element).tagName
          return tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'LINK'
        })
      })

      if (!significantChange) return

      const now = Date.now()
      const timeSinceLastChange = now - lastDOMChangeTime
      
      if (timeSinceLastChange < 150) { // menos sensible
        domChangeCount++
        
        if (domChangeCount > 20) { // requiere más cambios antes de alertar
          debugLogger.warn('render', 'Frequent DOM changes detected - possible render loop', {
            changeCount: domChangeCount,
            timeSinceLastChange,
            mutationsCount: mutations.length
          })
          domChangeCount = 0 // Reset counter
        }
      } else {
        domChangeCount = 1 // Reset si ha pasado suficiente tiempo
      }
      
      lastDOMChangeTime = now
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
      // Eliminamos attributes para evitar ruido por cambios de clases/estilos
    })
  }

  private setupDebugCommands() {
    // Comandos disponibles en la consola del navegador
    const debugCommands = {
      // Generar reporte completo
      generateReport: () => {
        const report = {
          timestamp: new Date().toISOString(),
          debugLogs: debugLogger.exportLogs(),
          componentHistory: componentDebugLogger.generateComponentReport(),
          fileChanges: fileWatcherDebug.generateReport(),
          performance: this.getPerformanceReport()
        }
        
        console.log('🔍 Complete Debug Report:', report)
        return report
      },

      // Limpiar todos los logs
      clearAllLogs: () => {
        debugLogger.clearLogs()
        componentDebugLogger.clearHistory()
        fileWatcherDebug.clearHistory()
        console.log('🧹 All debug logs cleared')
      },

      // Mostrar componentes problemáticos
      showProblematicComponents: () => {
        const problematic = componentDebugLogger.detectProblematicPatterns()
        console.log('⚠️ Problematic Components:', problematic)
        return problematic
      },

      // Mostrar archivos que cambian frecuentemente
      showFrequentFileChanges: () => {
        const frequent = fileWatcherDebug.getFrequentlyChangedFiles()
        console.log('📁 Frequently Changed Files:', frequent)
        return frequent
      },

      // Forzar análisis de patrones
      analyzePatterns: () => {
        const analysis = {
          components: componentDebugLogger.detectProblematicPatterns(),
          files: fileWatcherDebug.getFrequentlyChangedFiles(),
          errors: debugLogger.getLogs(undefined, 'error').slice(-10),
          warnings: debugLogger.getLogs(undefined, 'warn').slice(-10)
        }
        console.log('📊 Pattern Analysis:', analysis)
        return analysis
      }
    }

    // Exponer comandos globalmente
    ;(window as any).__debugCommands = debugCommands
    
    debugLogger.info('debug', 'Debug commands available in window.__debugCommands', {
      availableCommands: Object.keys(debugCommands)
    })
  }

  private setupAutomaticReporting() {
    // Generar reporte automático cada 2 minutos si hay actividad sospechosa
    setInterval(() => {
      const recentErrors = debugLogger.getLogs(undefined, 'error').filter(
        log => Date.now() - new Date(log.timestamp).getTime() < 120000 // Últimos 2 minutos
      )
      
      const recentWarnings = debugLogger.getLogs(undefined, 'warn').filter(
        log => Date.now() - new Date(log.timestamp).getTime() < 120000
      )

      if (recentErrors.length > 3 || recentWarnings.length > 5) {
        debugLogger.warn('debug', 'Automatic report: High error/warning activity detected', {
          recentErrors: recentErrors.length,
          recentWarnings: recentWarnings.length,
          recommendation: 'Check console for __debugCommands.generateReport()'
        })
      }
    }, 120000) // Cada 2 minutos
  }

  private getPerformanceReport() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    return {
      loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1048576)
      } : null
    }
  }

  // Método público para obtener estado del debug
  getDebugStatus() {
    return {
      initialized: this.isInitialized,
      enabled: this.isEnabled,
      systems: {
        debugLogger: !!debugLogger,
        componentDebugLogger: !!componentDebugLogger,
        fileWatcherDebug: !!fileWatcherDebug
      }
    }
  }
}

// Singleton instance
export const debugInitializer = new DebugInitializer()

// Auto-inicializar si estamos en el cliente
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  debugLogger.info('debug', 'Debug initializer loaded - systems ready for reload diagnosis')
}
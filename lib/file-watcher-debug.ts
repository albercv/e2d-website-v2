/**
 * File Watcher Debug System
 * 
 * Monitorea cambios de archivos que pueden causar recargas constantes
 * en el servidor de desarrollo de Next.js
 */

import { debugLogger } from './debug-logger'

export interface FileChangeEvent {
  path: string
  type: 'added' | 'changed' | 'removed'
  timestamp: string
  size?: number
  extension?: string
}

class FileWatcherDebug {
  private changeHistory: FileChangeEvent[] = []
  private maxHistory = 500
  private suspiciousPatterns: Map<string, number> = new Map()
  private isEnabled = process.env.NODE_ENV === 'development'

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupClientSideMonitoring()
      ;(window as any).__fileWatcherDebug = this
    }
  }

  private setupClientSideMonitoring() {
    // Monitorear cambios en el Performance Observer para detectar recargas
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              if (navEntry.type === 'reload') {
                debugLogger.warn('file-change', 'Page reload detected', {
                  type: navEntry.type,
                  loadEventEnd: navEntry.loadEventEnd,
                  domContentLoadedEventEnd: navEntry.domContentLoadedEventEnd
                })
                this.analyzeReloadPattern()
              }
            }
          })
        })
        
        observer.observe({ entryTypes: ['navigation'] })
      } catch (error) {
        debugLogger.error('file-change', 'Failed to setup PerformanceObserver', { error })
      }
    }

    // Monitorear cambios en el document para detectar Fast Refresh
    this.setupFastRefreshDetection()
  }

  private setupFastRefreshDetection() {
    let lastRefreshTime = Date.now()
    let refreshCount = 0

    // Detectar cuando React Fast Refresh se ejecuta
    const originalConsoleLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      
      if (message.includes('Fast Refresh') || message.includes('[HMR]') || message.includes('webpack-hmr')) {
        const now = Date.now()
        const timeSinceLastRefresh = now - lastRefreshTime
        
        refreshCount++
        
        debugLogger.info('hmr', 'Fast Refresh event detected', {
          message,
          timeSinceLastRefresh,
          refreshCount,
          args
        })

        // Detectar refresh loops (más de 5 refreshes en 10 segundos)
        if (timeSinceLastRefresh < 2000) { // Menos de 2 segundos entre refreshes
          this.detectRefreshLoop(refreshCount, timeSinceLastRefresh)
        } else {
          refreshCount = 1 // Reset counter si ha pasado tiempo suficiente
        }
        
        lastRefreshTime = now
      }
      
      return originalConsoleLog.apply(console, args)
    }
  }

  private detectRefreshLoop(count: number, interval: number) {
    if (count > 3) {
      debugLogger.error('hmr', 'Possible Fast Refresh loop detected!', {
        refreshCount: count,
        averageInterval: interval,
        recommendation: 'Check for components causing hydration mismatches or infinite re-renders'
      })
      
      // Analizar patrones de cambios recientes
      this.analyzeRecentChanges()
    }
  }

  private analyzeRecentChanges() {
    const recentChanges = this.changeHistory.slice(-20)
    const pathCounts = new Map<string, number>()
    
    recentChanges.forEach(change => {
      const count = pathCounts.get(change.path) || 0
      pathCounts.set(change.path, count + 1)
    })

    const suspiciousFiles = Array.from(pathCounts.entries())
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])

    if (suspiciousFiles.length > 0) {
      debugLogger.warn('file-change', 'Files with frequent changes detected', {
        suspiciousFiles: suspiciousFiles.slice(0, 5),
        totalRecentChanges: recentChanges.length
      })
    }
  }

  private analyzeReloadPattern() {
    const now = Date.now()
    const recentReloads = this.changeHistory.filter(
      change => now - new Date(change.timestamp).getTime() < 30000 // Últimos 30 segundos
    )

    if (recentReloads.length > 5) {
      debugLogger.error('file-change', 'Excessive reload pattern detected', {
        reloadsInLast30Seconds: recentReloads.length,
        files: recentReloads.map(r => r.path)
      })
    }
  }

  // Método para registrar cambios de archivos (llamado desde el servidor si es posible)
  logFileChange(path: string, type: FileChangeEvent['type'], size?: number) {
    if (!this.isEnabled) return

    const extension = path.split('.').pop()?.toLowerCase()
    const event: FileChangeEvent = {
      path,
      type,
      timestamp: new Date().toISOString(),
      size,
      extension
    }

    this.changeHistory.push(event)
    
    // Mantener solo los cambios recientes
    if (this.changeHistory.length > this.maxHistory) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistory)
    }

    // Detectar patrones sospechosos
    this.detectSuspiciousPatterns(event)

    debugLogger.info('file-change', `File ${type}: ${path}`, {
      extension,
      size,
      type
    })
  }

  private detectSuspiciousPatterns(event: FileChangeEvent) {
    const { path, type } = event
    
    // Incrementar contador para este archivo
    const currentCount = this.suspiciousPatterns.get(path) || 0
    this.suspiciousPatterns.set(path, currentCount + 1)

    // Detectar archivos que cambian muy frecuentemente
    if (currentCount > 5) {
      debugLogger.warn('file-change', 'File changing very frequently', {
        path,
        changeCount: currentCount + 1,
        type
      })
    }

    // Detectar tipos de archivos problemáticos
    const problematicExtensions = ['tsx', 'jsx', 'ts', 'js']
    if (event.extension && problematicExtensions.includes(event.extension)) {
      if (path.includes('node_modules')) {
        debugLogger.warn('file-change', 'Node modules file changed - possible dependency issue', {
          path,
          type
        })
      }
    }

    // Limpiar contadores antiguos cada minuto
    setTimeout(() => {
      this.suspiciousPatterns.delete(path)
    }, 60000)
  }

  // Métodos de análisis
  getChangeHistory(limit = 50): FileChangeEvent[] {
    return this.changeHistory.slice(-limit)
  }

  getFrequentlyChangedFiles(threshold = 3): Array<[string, number]> {
    return Array.from(this.suspiciousPatterns.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
  }

  getChangesByExtension(): Record<string, number> {
    const byExtension: Record<string, number> = {}
    
    this.changeHistory.forEach(change => {
      if (change.extension) {
        byExtension[change.extension] = (byExtension[change.extension] || 0) + 1
      }
    })
    
    return byExtension
  }

  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      totalChanges: this.changeHistory.length,
      recentChanges: this.getChangeHistory(20),
      frequentlyChanged: this.getFrequentlyChangedFiles(),
      changesByExtension: this.getChangesByExtension(),
      suspiciousPatterns: Array.from(this.suspiciousPatterns.entries())
    }

    return JSON.stringify(report, null, 2)
  }

  clearHistory() {
    this.changeHistory = []
    this.suspiciousPatterns.clear()
    debugLogger.info('file-change', 'File change history cleared')
  }
}

// Singleton instance
export const fileWatcherDebug = new FileWatcherDebug()

// Función helper para uso en el servidor (si es necesario)
export function logServerFileChange(path: string, type: FileChangeEvent['type'], size?: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [FILE WATCHER] ${type.toUpperCase()}: ${path}`, { size })
  }
}
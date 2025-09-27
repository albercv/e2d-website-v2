"use client"

import React from 'react'

/**
 * Performance Monitor - Sistema de monitoreo de rendimiento
 * Detecta bucles de renderizado, memory leaks y problemas de performance
 */

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  memoryUsage: number
  componentCounts: Map<string, number>
  suspiciousPatterns: string[]
}

interface RenderLoop {
  componentName: string
  renderCount: number
  timeWindow: number
  startTime: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private renderLoops: Map<string, RenderLoop>
  private memorySnapshots: number[]
  private isMonitoring: boolean
  private intervalId: NodeJS.Timeout | null

  constructor() {
    this.metrics = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      componentCounts: new Map(),
      suspiciousPatterns: []
    }
    this.renderLoops = new Map()
    this.memorySnapshots = []
    this.isMonitoring = false
    this.intervalId = null

    if (typeof window !== 'undefined') {
      this.setupGlobalMonitoring()
    }
  }

  private setupGlobalMonitoring() {
    // Monitor de performance global
    if ('performance' in window && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.includes('React')) {
              this.recordRenderTime(entry.duration)
            }
          }
        })
        observer.observe({ entryTypes: ['measure'] })
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error)
      }
    }

    // Monitor de memoria
    this.startMemoryMonitoring()
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('🔍 Performance Monitor iniciado')

    // Monitoreo cada 5 segundos
    this.intervalId = setInterval(() => {
      this.collectMetrics()
      this.detectSuspiciousPatterns()
    }, 5000)
  }

  stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('🛑 Performance Monitor detenido')
  }

  recordComponentRender(componentName: string) {
    const now = performance.now()
    
    // Actualizar contadores
    const currentCount = this.metrics.componentCounts.get(componentName) || 0
    this.metrics.componentCounts.set(componentName, currentCount + 1)
    this.metrics.renderCount++
    this.metrics.lastRenderTime = now

    // Detectar posibles bucles de renderizado
    this.detectRenderLoop(componentName, now)
  }

  private detectRenderLoop(componentName: string, timestamp: number) {
    const existing = this.renderLoops.get(componentName)
    const timeWindow = 1000 // 1 segundo

    if (!existing) {
      this.renderLoops.set(componentName, {
        componentName,
        renderCount: 1,
        timeWindow,
        startTime: timestamp
      })
      return
    }

    // Si está dentro de la ventana de tiempo
    if (timestamp - existing.startTime < timeWindow) {
      existing.renderCount++
      
      // Si renderiza más de 10 veces en 1 segundo, es sospechoso
      if (existing.renderCount > 10) {
        this.reportSuspiciousPattern(
          `Posible bucle de renderizado en ${componentName}: ${existing.renderCount} renders en ${timeWindow}ms`
        )
      }
    } else {
      // Reiniciar contador para nueva ventana de tiempo
      existing.renderCount = 1
      existing.startTime = timestamp
    }
  }

  private recordRenderTime(duration: number) {
    if (this.metrics.averageRenderTime === 0) {
      this.metrics.averageRenderTime = duration
    } else {
      // Promedio móvil
      this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 0.9) + (duration * 0.1)
    }

    // Detectar renders lentos
    if (duration > 16.67) { // Más de 16.67ms (60fps)
      this.reportSuspiciousPattern(`Render lento detectado: ${duration.toFixed(2)}ms`)
    }
  }

  private startMemoryMonitoring() {
    if (typeof window === 'undefined') return

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const currentUsage = memory.usedJSHeapSize
        
        this.metrics.memoryUsage = currentUsage
        this.memorySnapshots.push(currentUsage)
        
        // Mantener solo los últimos 20 snapshots
        if (this.memorySnapshots.length > 20) {
          this.memorySnapshots.shift()
        }
        
        this.detectMemoryLeaks()
      }
    }

    // Verificar memoria cada 10 segundos
    setInterval(checkMemory, 10000)
  }

  private detectMemoryLeaks() {
    if (this.memorySnapshots.length < 5) return

    const recent = this.memorySnapshots.slice(-5)
    const isIncreasing = recent.every((value, index) => 
      index === 0 || value > recent[index - 1]
    )

    if (isIncreasing) {
      const increase = recent[recent.length - 1] - recent[0]
      const increasePercent = (increase / recent[0]) * 100

      if (increasePercent > 20) { // Más del 20% de incremento
        this.reportSuspiciousPattern(
          `Posible memory leak: incremento del ${increasePercent.toFixed(1)}% en memoria`
        )
      }
    }
  }

  private collectMetrics() {
    // Limpiar render loops antiguos
    const now = performance.now()
    for (const [key, loop] of this.renderLoops.entries()) {
      if (now - loop.startTime > 5000) { // 5 segundos
        this.renderLoops.delete(key)
      }
    }
  }

  private detectSuspiciousPatterns() {
    // Detectar componentes que renderizan demasiado
    for (const [componentName, count] of this.metrics.componentCounts.entries()) {
      if (count > 100) { // Más de 100 renders
        this.reportSuspiciousPattern(
          `Componente con muchos renders: ${componentName} (${count} renders)`
        )
      }
    }

    // Detectar si hay demasiados renders en general
    if (this.metrics.renderCount > 1000) {
      this.reportSuspiciousPattern(
        `Alto número de renders totales: ${this.metrics.renderCount}`
      )
    }
  }

  private reportSuspiciousPattern(pattern: string) {
    if (!this.metrics.suspiciousPatterns.includes(pattern)) {
      this.metrics.suspiciousPatterns.push(pattern)
      console.warn('⚠️ Patrón sospechoso detectado:', pattern)
      
      // Enviar a debug logger si está disponible
      if (typeof window !== 'undefined' && (window as any).debugLogger) {
        (window as any).debugLogger.warn('performance', pattern)
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getReport(): string {
    const report = [
      '📊 REPORTE DE RENDIMIENTO',
      '========================',
      `Total de renders: ${this.metrics.renderCount}`,
      `Tiempo promedio de render: ${this.metrics.averageRenderTime.toFixed(2)}ms`,
      `Uso de memoria: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      '',
      '🔍 COMPONENTES MÁS ACTIVOS:',
      ...Array.from(this.metrics.componentCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => `  ${name}: ${count} renders`),
      '',
      '⚠️ PATRONES SOSPECHOSOS:',
      ...this.metrics.suspiciousPatterns.map(pattern => `  • ${pattern}`),
      ''
    ]

    return report.join('\n')
  }

  reset() {
    this.metrics = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      memoryUsage: 0,
      componentCounts: new Map(),
      suspiciousPatterns: []
    }
    this.renderLoops.clear()
    this.memorySnapshots = []
    console.log('🔄 Performance Monitor reiniciado')
  }
}

// Instancia global
export const performanceMonitor = new PerformanceMonitor()

// Hook para usar en componentes React
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.recordComponentRender(componentName)
  })

  return {
    getMetrics: () => performanceMonitor.getMetrics(),
    getReport: () => performanceMonitor.getReport(),
    reset: () => performanceMonitor.reset()
  }
}

// Exponer globalmente para debugging
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor
  
  // Comandos de consola
  ;(window as any).perfStart = () => performanceMonitor.startMonitoring()
  ;(window as any).perfStop = () => performanceMonitor.stopMonitoring()
  ;(window as any).perfReport = () => console.log(performanceMonitor.getReport())
  ;(window as any).perfReset = () => performanceMonitor.reset()
}

export default performanceMonitor
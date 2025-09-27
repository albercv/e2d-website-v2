"use client"

/**
 * Component Debug Logger
 * 
 * Sistema de logging específico para componentes React que ayuda a detectar:
 * - Montajes y desmontajes inesperados
 * - Problemas de hidratación
 * - Re-renders excesivos
 * - Errores de componentes
 */

import React, { useEffect, useRef, useState } from 'react'
import { debugLogger } from './debug-logger'

export interface ComponentLifecycleEvent {
  componentName: string
  event: 'mount' | 'unmount' | 'render' | 'error' | 'hydration-mismatch'
  timestamp: string
  props?: Record<string, any>
  state?: Record<string, any>
  renderCount?: number
  error?: Error
}

class ComponentDebugLogger {
  private lifecycleHistory: ComponentLifecycleEvent[] = []
  private renderCounts: Map<string, number> = new Map()
  private mountTimes: Map<string, number> = new Map()
  private isEnabled = process.env.NODE_ENV === 'development'
  private maxHistory = 1000

  constructor() {
    if (this.isEnabled && typeof window !== 'undefined') {
      ;(window as any).__componentDebugLogger = this
      this.setupGlobalErrorHandling()
    }
  }

  private setupGlobalErrorHandling() {
    // Capturar errores de React
    const originalConsoleError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      
      // Detectar errores de hidratación
      if (message.includes('Hydration') || message.includes('hydration')) {
        debugLogger.error('component', 'Hydration error detected', {
          message,
          args,
          stack: new Error().stack
        })
        
        this.logLifecycleEvent('unknown', 'hydration-mismatch', {
          error: new Error(message)
        })
      }
      
      // Detectar errores de componentes
      if (message.includes('React') || message.includes('component')) {
        debugLogger.error('component', 'React component error', {
          message,
          args
        })
      }
      
      return originalConsoleError.apply(console, args)
    }

    // Capturar errores no manejados
    window.addEventListener('error', (event) => {
      if (event.error && event.error.stack && event.error.stack.includes('React')) {
        debugLogger.error('component', 'Unhandled React error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        })
      }
    })
  }

  logLifecycleEvent(
    componentName: string,
    event: ComponentLifecycleEvent['event'],
    data?: {
      props?: Record<string, any>
      state?: Record<string, any>
      renderCount?: number
      error?: Error
    }
  ) {
    if (!this.isEnabled) return

    const now = Date.now()
    const renderCount = this.renderCounts.get(componentName) || 0

    if (event === 'mount') {
      this.mountTimes.set(componentName, now)
      debugLogger.info('component', `Component mounted: ${componentName}`, data)
    } else if (event === 'unmount') {
      const mountTime = this.mountTimes.get(componentName)
      const lifespan = mountTime ? now - mountTime : 0
      this.mountTimes.delete(componentName)
      this.renderCounts.delete(componentName)
      
      debugLogger.info('component', `Component unmounted: ${componentName}`, {
        ...data,
        lifespan: `${lifespan}ms`
      })
    } else if (event === 'render') {
      const newRenderCount = renderCount + 1
      this.renderCounts.set(componentName, newRenderCount)
      
      // Detectar re-renders excesivos
      if (newRenderCount > 10) {
        debugLogger.warn('component', `Excessive re-renders detected: ${componentName}`, {
          renderCount: newRenderCount,
          ...data
        })
      }
    }

    const lifecycleEvent: ComponentLifecycleEvent = {
      componentName,
      event,
      timestamp: new Date().toISOString(),
      renderCount: this.renderCounts.get(componentName),
      ...data
    }

    this.lifecycleHistory.push(lifecycleEvent)

    // Mantener solo eventos recientes
    if (this.lifecycleHistory.length > this.maxHistory) {
      this.lifecycleHistory = this.lifecycleHistory.slice(-this.maxHistory)
    }
  }

  // Detectar patrones problemáticos
  detectProblematicPatterns() {
    const recentEvents = this.lifecycleHistory.slice(-50)
    const componentCounts = new Map<string, { mounts: number, unmounts: number }>()

    recentEvents.forEach(event => {
      const current = componentCounts.get(event.componentName) || { mounts: 0, unmounts: 0 }
      
      if (event.event === 'mount') {
        current.mounts++
      } else if (event.event === 'unmount') {
        current.unmounts++
      }
      
      componentCounts.set(event.componentName, current)
    })

    // Detectar componentes que se montan/desmontan frecuentemente
    const problematicComponents = Array.from(componentCounts.entries())
      .filter(([_, counts]) => counts.mounts > 3 || counts.unmounts > 3)
      .map(([name, counts]) => ({ name, ...counts }))

    if (problematicComponents.length > 0) {
      debugLogger.warn('component', 'Components with frequent mount/unmount cycles detected', {
        components: problematicComponents
      })
    }

    return problematicComponents
  }

  // Generar reporte de componentes
  generateComponentReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      totalEvents: this.lifecycleHistory.length,
      currentlyMounted: Array.from(this.mountTimes.keys()),
      renderCounts: Object.fromEntries(this.renderCounts),
      recentEvents: this.lifecycleHistory.slice(-20),
      problematicPatterns: this.detectProblematicPatterns()
    }

    return JSON.stringify(report, null, 2)
  }

  getComponentHistory(componentName: string): ComponentLifecycleEvent[] {
    return this.lifecycleHistory.filter(event => event.componentName === componentName)
  }

  clearHistory() {
    this.lifecycleHistory = []
    this.renderCounts.clear()
    this.mountTimes.clear()
    debugLogger.info('component', 'Component debug history cleared')
  }
}

// Singleton instance
export const componentDebugLogger = new ComponentDebugLogger()

// Hook personalizado para logging automático de componentes
export function useComponentDebugLogger(componentName: string, props?: Record<string, any>) {
  const renderCountRef = useRef(0)
  const [, forceUpdate] = useState({})

  useEffect(() => {
    // Log mount
    componentDebugLogger.logLifecycleEvent(componentName, 'mount', { props })

    return () => {
      // Log unmount
      componentDebugLogger.logLifecycleEvent(componentName, 'unmount')
    }
  }, [componentName])

  useEffect(() => {
    // Log render
    renderCountRef.current++
    componentDebugLogger.logLifecycleEvent(componentName, 'render', {
      props,
      renderCount: renderCountRef.current
    })
  })

  // Función para forzar re-render (útil para debugging)
  const forceRender = () => {
    forceUpdate({})
  }

  return {
    renderCount: renderCountRef.current,
    forceRender
  }
}

// HOC para wrappear componentes con logging automático
export function withComponentDebugLogger<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const ComponentWithDebugLogger = (props: P) => {
    useComponentDebugLogger(displayName, props as Record<string, any>)
    
    try {
      return React.createElement(WrappedComponent, props)
    } catch (error) {
      componentDebugLogger.logLifecycleEvent(displayName, 'error', {
        error: error as Error,
        props: props as Record<string, any>
      })
      throw error
    }
  }

  ComponentWithDebugLogger.displayName = `withComponentDebugLogger(${displayName})`
  
  return ComponentWithDebugLogger
}

// Componente de error boundary con logging
export class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; componentName?: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'Unknown'
    
    componentDebugLogger.logLifecycleEvent(componentName, 'error', {
      error,
      props: { errorInfo }
    })

    debugLogger.error('component', `Error boundary caught error in ${componentName}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        className: "p-4 bg-red-50 border border-red-200 rounded-lg"
      }, [
        React.createElement('h3', {
          key: 'title',
          className: "text-red-800 font-semibold"
        }, 'Component Error'),
        React.createElement('p', {
          key: 'message',
          className: "text-red-600 text-sm mt-1"
        }, this.state.error?.message || 'An error occurred in this component'),
        process.env.NODE_ENV === 'development' ? React.createElement('details', {
          key: 'details',
          className: "mt-2"
        }, [
          React.createElement('summary', {
            key: 'summary',
            className: "text-red-700 cursor-pointer"
          }, 'Stack Trace'),
          React.createElement('pre', {
            key: 'stack',
            className: "text-xs text-red-600 mt-1 overflow-auto"
          }, this.state.error?.stack)
        ]) : null
      ])
    }

    return this.props.children
  }
}
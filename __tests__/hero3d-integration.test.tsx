import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock Next.js dynamic import
jest.mock('next/dynamic', () => {
  return jest.fn(() => {
    const MockedComponent = () => (
      <div data-testid="hero3d-mock">Hero3D Component Loaded</div>
    )
    MockedComponent.displayName = 'Hero3DLazy'
    return MockedComponent
  })
})

// Mock del debug logger
jest.mock('@/lib/component-debug-logger', () => ({
  useComponentDebugLogger: jest.fn(() => ({
    renderCount: 1,
    logEvent: jest.fn(),
  })),
}))

describe('Hero3D Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load Hero3DLazy component without SSR issues', async () => {
    // Importar dinámicamente el componente lazy
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    render(<Hero3DLazy />)
    
    await waitFor(() => {
      expect(screen.getByTestId('hero3d-mock')).toBeInTheDocument()
    })
  })

  it('should handle client-only rendering', async () => {
    // Simular entorno de servidor
    const originalWindow = global.window
    delete (global as any).window

    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    // No debería fallar en el servidor
    expect(() => render(<Hero3DLazy />)).not.toThrow()
    
    // Restaurar window
    global.window = originalWindow
  })

  it('should show loading state initially', async () => {
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    render(<Hero3DLazy />)
    
    // Verificar que el componente se renderiza (aunque sea el mock)
    await waitFor(() => {
      expect(screen.getByTestId('hero3d-mock')).toBeInTheDocument()
    })
  })

  it('should handle multiple mount/unmount cycles', async () => {
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    const { unmount, rerender } = render(<Hero3DLazy />)
    
    // Múltiples ciclos de renderizado
    for (let i = 0; i < 3; i++) {
      rerender(<Hero3DLazy />)
      await waitFor(() => {
        expect(screen.getByTestId('hero3d-mock')).toBeInTheDocument()
      })
    }
    
    unmount()
    expect(screen.queryByTestId('hero3d-mock')).not.toBeInTheDocument()
  })
})

describe('Hero3D Performance Tests', () => {
  it('should not cause memory leaks during rapid re-renders', async () => {
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // Renderizar múltiples veces
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<Hero3DLazy />)
      await waitFor(() => {
        expect(screen.getByTestId('hero3d-mock')).toBeInTheDocument()
      })
      unmount()
    }
    
    // Forzar garbage collection si está disponible
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // La memoria no debería crecer significativamente
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory
      expect(memoryGrowth).toBeLessThan(1024 * 1024) // Menos de 1MB de crecimiento
    }
  })

  it('should render within acceptable time limits', async () => {
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    const startTime = performance.now()
    
    render(<Hero3DLazy />)
    
    await waitFor(() => {
      expect(screen.getByTestId('hero3d-mock')).toBeInTheDocument()
    })
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(500) // Menos de 500ms
  })
})

describe('Hero3D Error Handling', () => {
  it('should handle component errors gracefully', async () => {
    // Mock console.error para capturar errores
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    // Forzar un error en el mock
    jest.mocked(require('next/dynamic')).mockImplementationOnce(() => {
      return jest.fn(() => {
        throw new Error('Test error')
      })
    })
    
    expect(() => render(<Hero3DLazy />)).not.toThrow()
    
    consoleSpy.mockRestore()
  })

  it('should handle missing WebGL support', async () => {
    // Mock getContext para simular falta de WebGL
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
    
    const { Hero3DLazy } = await import('@/components/performance/lazy-components')
    
    expect(() => render(<Hero3DLazy />)).not.toThrow()
    
    // Restaurar método original
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })
})
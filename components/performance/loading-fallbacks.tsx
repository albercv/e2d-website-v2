"use client"

/**
 * Loading Fallbacks Components
 * 
 * Mobile-first loading states and fallbacks for different component types.
 * These components provide smooth loading experiences across all device sizes.
 */

interface LoadingFallbackProps {
  className?: string
  message?: string
}

/**
 * 3D Content Loading Fallback
 * Optimized for mobile devices with reduced animations and clear messaging
 */
export function Hero3DFallback({ className = "", message = "Preparando experiencia 3D..." }: LoadingFallbackProps) {
  return (
    <div className={`w-full h-full bg-gradient-to-br from-background to-muted flex items-center justify-center ${className}`}>
      <div className="text-center space-y-4 p-4">
        {/* Animated 3D-like placeholder */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute inset-0 rounded-full bg-[#05b4ba]/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-[#05b4ba]/40 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-[#05b4ba] animate-bounce" />
        </div>
        
        {/* Loading message */}
        <div className="text-muted-foreground text-sm sm:text-base font-medium">
          {message}
        </div>
        
        {/* Progress indicator for mobile */}
        <div className="w-32 h-1 bg-muted rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-[#05b4ba] rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Section Loading Fallback
 * Generic fallback for section components
 */
export function SectionFallback({ 
  className = "", 
  message = "Cargando contenido...",
  showSkeleton = true 
}: LoadingFallbackProps & { showSkeleton?: boolean }) {
  return (
    <section className={`py-12 sm:py-16 lg:py-24 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          {/* Title skeleton */}
          {showSkeleton && (
            <div className="h-6 sm:h-8 bg-muted rounded w-48 sm:w-64 mx-auto animate-pulse" />
          )}
          
          {/* Loading message */}
          <div className="text-muted-foreground text-sm sm:text-base">
            {message}
          </div>
          
          {/* Content skeleton */}
          {showSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 sm:h-48 lg:h-64 bg-muted rounded animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Modal Loading Fallback
 * For overlay components like AI Agent Modal
 */
export function ModalFallback({ className = "", message = "Cargando..." }: LoadingFallbackProps) {
  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="bg-background border rounded-lg p-6 sm:p-8 shadow-lg max-w-sm mx-4">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#05b4ba] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-muted-foreground text-sm sm:text-base">
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Error Boundary Fallback
 * For when components fail to load
 */
export function ErrorFallback({ 
  className = "", 
  message = "Error al cargar el contenido",
  onRetry 
}: LoadingFallbackProps & { onRetry?: () => void }) {
  return (
    <div className={`w-full h-full bg-muted/30 flex items-center justify-center p-4 ${className}`}>
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div className="text-muted-foreground text-sm sm:text-base">
          {message}
        </div>
        
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-4 py-2 bg-[#05b4ba] text-white rounded-md text-sm hover:bg-[#05b4ba]/90 transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"

/**
 * ClientOnly Component
 * 
 * A robust wrapper component that ensures child components only render on the client-side,
 * preventing hydration mismatches and SSR issues with browser-dependent libraries.
 * 
 * This component follows the SOLID principles:
 * - Single Responsibility: Only handles client-side rendering logic
 * - Open/Closed: Extensible through children prop without modification
 * - Interface Segregation: Simple, focused interface
 * 
 * @param children - React components that require client-side rendering
 * @param fallback - Optional loading component to show during hydration
 * @param className - Optional CSS classes for the wrapper
 */
interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function ClientOnly({ children, fallback = null, className }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // Set mounted state after component mounts on client
    setHasMounted(true)
  }, [])

  // During SSR and before hydration, show fallback
  if (!hasMounted) {
    return fallback ? (
      <div className={className} data-testid="client-only-fallback">
        {fallback}
      </div>
    ) : null
  }

  // After hydration, render children
  return (
    <div className={className} data-testid="client-only-content">
      {children}
    </div>
  )
}

/**
 * Higher-Order Component version for more complex use cases
 * 
 * @param Component - The component to wrap with client-only rendering
 * @param fallback - Optional fallback component
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ClientOnly fallback={fallback}>
      <Component {...props} />
    </ClientOnly>
  )

  WrappedComponent.displayName = `withClientOnly(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
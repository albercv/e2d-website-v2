"use client"

import { Suspense, lazy, useEffect, useState, useRef } from "react"

// Ultra-lazy loading for Three.js components - only load when actually needed
const LazyHero3D = lazy(() => 
  import("./hero-3d").then(module => ({ default: module.Hero3D }))
)

// Lightweight fallback component
const Hero3DFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-background/50 to-background/80 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-muted-foreground text-sm">Loading 3D Scene...</div>
  </div>
)

// Custom hook for intersection observer
function useIntersectionObserver(threshold = 0.1, rootMargin = "100px") {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect() // Only trigger once
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, isInView }
}

interface Hero3DOptimizedProps {
  className?: string
  [key: string]: any
}

export function Hero3DOptimized({ className, ...props }: Hero3DOptimizedProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const { ref, isInView } = useIntersectionObserver(0.1, "100px")

  // Delay loading until component is in view and browser is idle
  useEffect(() => {
    if (isInView && !shouldLoad) {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setShouldLoad(true)
        }, { timeout: 2000 })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          setShouldLoad(true)
        }, 100)
      }
    }
  }, [isInView, shouldLoad])

  return (
    <div ref={ref} className={className}>
      {shouldLoad ? (
        <Suspense fallback={<Hero3DFallback />}>
          <LazyHero3D {...props} />
        </Suspense>
      ) : (
        <Hero3DFallback />
      )}
    </div>
  )
}

export default Hero3DOptimized
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseIntelligentOrbLoadingOptions {
  /**
   * Delay in milliseconds before starting the orb loading process
   * @default 100
   */
  delay?: number
  
  /**
   * Whether to use Intersection Observer to load only when visible
   * @default true
   */
  useIntersectionObserver?: boolean
  
  /**
   * Intersection Observer threshold
   * @default 0.1
   */
  threshold?: number
  
  /**
   * Whether to use requestIdleCallback for non-blocking initialization
   * @default true
   */
  useIdleCallback?: boolean
}

/**
 * Hook for intelligent Orb loading that prioritizes critical content rendering
 * 
 * This hook implements multiple performance optimization strategies:
 * 1. requestIdleCallback - Waits for browser idle time
 * 2. Intersection Observer - Only loads when component is visible
 * 3. Configurable delay - Allows critical content to render first
 * 
 * @param containerRef - Ref to the container element for intersection observation
 * @param options - Configuration options for loading behavior
 * @returns Object with loading state and control functions
 */
export function useIntelligentOrbLoading(
  containerRef: React.RefObject<HTMLElement>,
  options: UseIntelligentOrbLoadingOptions = {}
) {
  const {
    delay = 100,
    useIntersectionObserver = true,
    threshold = 0.1,
    useIdleCallback = true
  } = options

  const [shouldLoadOrb, setShouldLoadOrb] = useState(false)
  const [isOrbVisible, setIsOrbVisible] = useState(false)
  const [isOrbLoaded, setIsOrbLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState<Error | null>(null)
  
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const idleCallbackRef = useRef<number | null>(null)

  // Function to start orb loading
  const startOrbLoading = useCallback(() => {
    if (shouldLoadOrb) return // Already loading or loaded
    
    const initiateLoading = () => {
      try {
        setShouldLoadOrb(true)
      } catch (error) {
        setLoadingError(error as Error)
      }
    }

    if (useIdleCallback && 'requestIdleCallback' in window) {
      // Use requestIdleCallback for non-blocking initialization
      idleCallbackRef.current = requestIdleCallback(
        () => {
          timeoutRef.current = setTimeout(initiateLoading, delay)
        },
        { timeout: 2000 } // Fallback timeout
      )
    } else {
      // Fallback to setTimeout
      timeoutRef.current = setTimeout(initiateLoading, delay)
    }
  }, [shouldLoadOrb, delay, useIdleCallback])

  // Set up Intersection Observer
  useEffect(() => {
    if (!useIntersectionObserver || !containerRef.current) {
      // If not using intersection observer, start loading immediately
      startOrbLoading()
      return
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      setIsOrbVisible(entry.isIntersecting)
      
      if (entry.isIntersecting) {
        startOrbLoading()
        // Disconnect observer after first intersection
        if (intersectionObserverRef.current) {
          intersectionObserverRef.current.disconnect()
        }
      }
    }

    intersectionObserverRef.current = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin: '50px' // Start loading slightly before element is visible
    })

    intersectionObserverRef.current.observe(containerRef.current)

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
      }
    }
  }, [containerRef, useIntersectionObserver, threshold, startOrbLoading])

  // Cleanup function
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (idleCallbackRef.current && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackRef.current)
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
      }
    }
  }, [])

  // Manual control functions
  const forceLoad = useCallback(() => {
    setShouldLoadOrb(true)
  }, [])

  const resetLoading = useCallback(() => {
    setShouldLoadOrb(false)
    setIsOrbLoaded(false)
    setLoadingError(null)
  }, [])

  const markAsLoaded = useCallback(() => {
    setIsOrbLoaded(true)
  }, [])

  return {
    // State
    shouldLoadOrb,
    isOrbVisible,
    isOrbLoaded,
    loadingError,
    
    // Control functions
    forceLoad,
    resetLoading,
    markAsLoaded,
    
    // Computed states
    isLoading: shouldLoadOrb && !isOrbLoaded,
    canRender: shouldLoadOrb,
    hasError: !!loadingError
  }
}

/**
 * Simplified version of the hook for basic lazy loading
 */
export function useSimpleOrbLoading(delay: number = 500) {
  const [shouldLoad, setShouldLoad] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => setShouldLoad(true))
      } else {
        setShouldLoad(true)
      }
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  return shouldLoad
}
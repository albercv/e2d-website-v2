"use client"

import dynamic from "next/dynamic"
import { ComponentProps, ReactNode, useState, useEffect } from "react"

/**
 * Ultra-optimized motion components with aggressive lazy loading
 * Only loads framer-motion when actually needed and visible
 */

// Fallback components for better UX
const MotionFallback = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className} style={{ opacity: 0, animation: 'fadeIn 0.3s ease-in-out forwards' }}>
    {children}
  </div>
)

const SectionFallback = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={className} style={{ opacity: 0, animation: 'fadeIn 0.3s ease-in-out forwards' }}>
    {children}
  </section>
)

// Intersection Observer hook for visibility-based loading
function useIntersectionObserver(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only load once
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, threshold]);

  return { isVisible, setElement };
}

// Ultra-lazy motion.div - only loads when visible
export const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.div })),
  {
    ssr: false,
    loading: () => <MotionFallback children={null} />,
  }
)

// Visibility-aware motion div
export function LazyMotionDiv(props: ComponentProps<'div'> & { 
  animate?: any; 
  initial?: any; 
  transition?: any;
  viewport?: any;
  whileInView?: any;
}) {
  const { isVisible, setElement } = useIntersectionObserver();
  const [MotionComponent, setMotionComponent] = useState<any>(null);

  useEffect(() => {
    if (isVisible && !MotionComponent) {
      import("framer-motion").then((mod) => {
        setMotionComponent(() => mod.motion.div);
      });
    }
  }, [isVisible, MotionComponent]);

  if (!MotionComponent) {
    return (
      <div 
        ref={setElement as any} 
        className={props.className}
        style={{ opacity: 0, transform: 'translateY(20px)' }}
      >
        {props.children}
      </div>
    );
  }

  return <MotionComponent {...props} />;
}

// Ultra-lazy motion.section
export const MotionSection = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.section })),
  {
    ssr: false,
    loading: () => <SectionFallback children={null} />,
  }
)

// Visibility-aware motion section
export function LazyMotionSection(props: ComponentProps<'section'> & { 
  animate?: any; 
  initial?: any; 
  transition?: any;
  viewport?: any;
  whileInView?: any;
}) {
  const { isVisible, setElement } = useIntersectionObserver();
  const [MotionComponent, setMotionComponent] = useState<any>(null);

  useEffect(() => {
    if (isVisible && !MotionComponent) {
      import("framer-motion").then((mod) => {
        setMotionComponent(() => mod.motion.section);
      });
    }
  }, [isVisible, MotionComponent]);

  if (!MotionComponent) {
    return (
      <section 
        ref={setElement as any} 
        className={props.className}
        style={{ opacity: 0, transform: 'translateY(20px)' }}
      >
        {props.children}
      </section>
    );
  }

  return <MotionComponent {...props} />;
}

// Ultra-lazy AnimatePresence - only when needed
export const LazyAnimatePresence = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.AnimatePresence })),
  {
    ssr: false,
    loading: () => <div />,
  }
)

// Conditional motion wrapper - only loads motion when animations are actually used
export function ConditionalMotion({ 
  children, 
  useMotion = false, 
  ...motionProps 
}: { 
  children: ReactNode; 
  useMotion?: boolean;
  animate?: any;
  initial?: any;
  transition?: any;
  viewport?: any;
  whileInView?: any;
}) {
  const [MotionDiv, setMotionDiv] = useState<any>(null);

  useEffect(() => {
    if (useMotion && !MotionDiv) {
      import("framer-motion").then((mod) => {
        setMotionDiv(() => mod.motion.div);
      });
    }
  }, [useMotion, MotionDiv]);

  if (!useMotion) {
    return <div>{children}</div>;
  }

  if (!MotionDiv) {
    return (
      <div style={{ opacity: 0, transform: 'translateY(10px)' }}>
        {children}
      </div>
    );
  }

  return <MotionDiv {...motionProps}>{children}</MotionDiv>;
}

// Batch motion loader - loads motion once for multiple components
let motionPromise: Promise<any> | null = null;

export function preloadMotion() {
  if (!motionPromise) {
    motionPromise = import("framer-motion");
  }
  return motionPromise;
}

// High-performance motion div with preloading
export function OptimizedMotionDiv(props: ComponentProps<'div'> & { 
  animate?: any; 
  initial?: any; 
  transition?: any;
  viewport?: any;
  whileInView?: any;
}) {
  const [MotionComponent, setMotionComponent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    preloadMotion().then((mod) => {
      setMotionComponent(() => mod.motion.div);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !MotionComponent) {
    return (
      <div 
        className={props.className}
        style={{ 
          opacity: 0, 
          transform: 'translateY(10px)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {props.children}
      </div>
    );
  }

  return <MotionComponent {...props} />;
}
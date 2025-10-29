"use client"

import dynamic from "next/dynamic"

/**
 * Lazy-loaded motion components to reduce initial bundle size
 * Only loads framer-motion when animations are actually needed
 */

// Lazy load motion.div with fallback
export const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.div })),
  {
    ssr: false,
    loading: () => <div />,
  }
)

// Lazy load motion.section with fallback
export const MotionSection = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.section })),
  {
    ssr: false,
    loading: () => <section />,
  }
)

// Lazy load AnimatePresence
export const AnimatePresence = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.AnimatePresence })),
  {
    ssr: false,
    loading: () => <div />,
  }
)
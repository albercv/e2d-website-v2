"use client"

import { motion } from "framer-motion"

interface OrbSkeletonProps {
  /**
   * Whether to show a subtle animation while loading
   * @default true
   */
  animated?: boolean
  
  /**
   * Custom className for styling
   */
  className?: string
}

/**
 * Skeleton component displayed while the Orb is loading
 * 
 * This component provides a lightweight placeholder that:
 * 1. Maintains the visual space for the Orb
 * 2. Provides visual feedback that content is loading
 * 3. Uses minimal resources to avoid performance impact
 * 4. Matches the Orb's visual characteristics
 */
export function OrbSkeleton({ animated = true, className = "" }: OrbSkeletonProps) {
  const baseClasses = `
    absolute inset-0 
    flex items-center justify-center
    bg-gradient-to-br from-background/20 to-background/5
    backdrop-blur-sm
    ${className}
  `

  if (!animated) {
    return (
      <div className={baseClasses}>
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#05b4ba]/10 to-[#293039]/10 opacity-50" />
      </div>
    )
  }

  return (
    <div className={baseClasses}>
      {/* Main orb skeleton */}
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#05b4ba]/10 to-[#293039]/10"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner glow effect */}
        <motion.div
          className="absolute inset-2 rounded-full bg-gradient-to-br from-[#05b4ba]/20 to-transparent"
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
        
        {/* Outer ring */}
        <motion.div
          className="absolute -inset-4 rounded-full border border-[#05b4ba]/20"
          animate={{
            rotate: [0, 360],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </motion.div>

      {/* Loading indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <motion.div
          className="flex space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-[#05b4ba]/60 rounded-full"
              animate={{
                y: [-2, 2, -2],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Minimal skeleton for performance-critical scenarios
 */
export function MinimalOrbSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 bg-background/10 ${className}`}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-24 h-24 rounded-full bg-[#05b4ba]/5 animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Skeleton with custom dimensions to match specific Orb configurations
 */
export function CustomOrbSkeleton({ 
  size = 128, 
  color = "#05b4ba",
  className = "" 
}: { 
  size?: number
  color?: string
  className?: string 
}) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color}10, transparent)`,
        }}
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}
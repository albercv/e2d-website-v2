"use client"

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useFirstGesture } from "@/lib/perf/use-first-gesture"
import {
  getLiveBackgroundQuality,
  readBackgroundEnv,
  shouldOfferLiveBackground,
  type BackgroundEnv,
} from "@/lib/perf/live-background-policy"

// Loaded on demand only: Three.js is 180 KiB gz and must stay out of the
// initial bundle. Lighthouse and crawlers never gesture, so they never
// download it; visitors get the animation on their first move or touch.
//
// A chunk that fails to load (typically a 404 right after a deploy replaced
// .next/static) must not take the page down: there is no error boundary above
// the hero. Falling back to an empty component keeps mode at "loading", so the
// snapshot stays visible and no retry storm starts.
const LiquidEtherLazy = lazy(() =>
  import("@/components/sections/LiquidEther").catch(() => ({ default: () => null })),
)

// Visual props of the fluid, identical to the look shipped before the facade.
const LIQUID_ETHER_LOOK = {
  colors: ["#5227FF", "#FF9FFC", "#B19EEF"],
  mouseForce: 12,
  cursorSize: 90,
  isViscous: true,
  viscous: 18,
  isBounce: false,
  // Load-bearing: the snapshot-to-live crossfade depends on this. onReady only
  // fires once the auto demo is active (the wrapper is pointer-events-none, so
  // the visitor can never "take control" of the fluid). With autoDemo: false
  // the snapshot would never fade out.
  autoDemo: true,
  autoSpeed: 0.35,
  autoIntensity: 1.6,
  takeoverDuration: 0.25,
  autoResumeDelay: 3000,
  autoRampDuration: 0.6,
}

const LIQUID_ETHER_STYLE = { width: "100%", height: "100%", position: "relative" } as const

type Mode = "static" | "loading" | "live"

export function HeroBackground() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const heroVisibleRef = useRef(true)
  const [mode, setMode] = useState<Mode>("static")
  const [env, setEnv] = useState<BackgroundEnv | null>(null)

  // Media queries are read after hydration only: the server has no viewport
  // and rendering from them would cause a hydration mismatch.
  useEffect(() => {
    setEnv(readBackgroundEnv())
  }, [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new IntersectionObserver(([entry]) => {
      heroVisibleRef.current = entry.isIntersecting
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  // A gesture while the hero is scrolled away must not pay for the fluid.
  const handleGesture = useCallback((): boolean => {
    if (!heroVisibleRef.current) return false
    setMode("loading")
    return true
  }, [])

  const offerLive = env !== null && mode === "static" && shouldOfferLiveBackground(env)
  useFirstGesture(handleGesture, offerLive)

  const quality = env ? getLiveBackgroundQuality(env) : null

  return (
    <div ref={wrapperRef} data-hero-background className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">
      <picture
        data-hero-snapshot
        className={cn("absolute inset-0 transition-opacity duration-700", mode === "live" ? "opacity-0" : "opacity-100")}
      >
        <source media="(orientation: portrait)" srcSet="/hero/liquid-ether-portrait.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element -- art direction by orientation; next/image cannot switch sources */}
        <img
          src="/hero/liquid-ether-landscape.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
      {mode !== "static" && quality && (
        <Suspense fallback={null}>
          <LiquidEtherLazy
            {...LIQUID_ETHER_LOOK}
            {...quality}
            style={LIQUID_ETHER_STYLE}
            onReady={() => setMode("live")}
          />
        </Suspense>
      )}
    </div>
  )
}

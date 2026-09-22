// Decides whether the hero may upgrade from its static snapshot to the WebGL
// fluid simulation, and with which quality. Pure functions over a small env
// snapshot so the rules are unit-testable without jsdom media queries.

export interface BackgroundEnv {
  reducedMotion: boolean
  saveData: boolean
  coarsePointer: boolean
}

export interface LiquidEtherQuality {
  iterationsViscous: number
  iterationsPoisson: number
  resolution: number
  maxPixelRatio: number
}

// Desktop keeps the look shipped before the facade. Touch devices get half
// the solver iterations and a lower DPR cap: phones are where the fluid
// saturated the main thread and where Lighthouse measures.
const DESKTOP_QUALITY: LiquidEtherQuality = {
  iterationsViscous: 32,
  iterationsPoisson: 32,
  resolution: 0.5,
  maxPixelRatio: 2,
}

const TOUCH_QUALITY: LiquidEtherQuality = {
  iterationsViscous: 16,
  iterationsPoisson: 16,
  resolution: 0.5,
  maxPixelRatio: 1.5,
}

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean }
}

export function shouldOfferLiveBackground(env: BackgroundEnv): boolean {
  return !env.reducedMotion && !env.saveData
}

export function getLiveBackgroundQuality(env: BackgroundEnv): LiquidEtherQuality {
  return env.coarsePointer ? TOUCH_QUALITY : DESKTOP_QUALITY
}

function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches
}

export function readBackgroundEnv(): BackgroundEnv {
  if (typeof window === "undefined") return { reducedMotion: false, saveData: false, coarsePointer: false }
  const nav = navigator as NavigatorWithConnection
  return {
    reducedMotion: mediaMatches("(prefers-reduced-motion: reduce)"),
    saveData: Boolean(nav.connection?.saveData),
    coarsePointer: mediaMatches("(pointer: coarse)"),
  }
}

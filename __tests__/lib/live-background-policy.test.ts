/** @jest-environment jsdom */
import {
  getLiveBackgroundQuality,
  readBackgroundEnv,
  shouldOfferLiveBackground,
  type BackgroundEnv,
} from "@/lib/perf/live-background-policy"

const base: BackgroundEnv = { reducedMotion: false, saveData: false, coarsePointer: false }

describe("shouldOfferLiveBackground", () => {
  it.each<[Partial<BackgroundEnv>, boolean]>([
    [{}, true],
    [{ reducedMotion: true }, false],
    [{ saveData: true }, false],
    [{ coarsePointer: true }, true],
  ])("%o → %s", (overrides, expected) => {
    expect(shouldOfferLiveBackground({ ...base, ...overrides })).toBe(expected)
  })
})

describe("getLiveBackgroundQuality", () => {
  it("keeps the shipped desktop look on fine pointers", () => {
    expect(getLiveBackgroundQuality(base)).toEqual({
      iterationsViscous: 32,
      iterationsPoisson: 32,
      resolution: 0.5,
      maxPixelRatio: 2,
    })
  })

  it("halves the solver iterations and caps the DPR on coarse pointers", () => {
    expect(getLiveBackgroundQuality({ ...base, coarsePointer: true })).toEqual({
      iterationsViscous: 16,
      iterationsPoisson: 16,
      resolution: 0.5,
      maxPixelRatio: 1.5,
    })
  })
})

describe("readBackgroundEnv", () => {
  function mockMatchMedia(matching: string[]): void {
    window.matchMedia = jest.fn((query: string) => ({ matches: matching.includes(query) })) as unknown as typeof window.matchMedia
  }

  afterEach(() => {
    delete (navigator as { connection?: unknown }).connection
  })

  it("reads the media queries and the save-data hint", () => {
    mockMatchMedia(["(prefers-reduced-motion: reduce)", "(pointer: coarse)"])
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true })
    expect(readBackgroundEnv()).toEqual({ reducedMotion: true, saveData: true, coarsePointer: true })
  })

  it("defaults every flag to false", () => {
    mockMatchMedia([])
    expect(readBackgroundEnv()).toEqual(base)
  })
})

/** @jest-environment jsdom */
import { act, render } from "@testing-library/react"

// react-dom 18.3 (jest) predates fetchPriority; the app router renders with
// Next's React canary, which supports it. Silence only that one warning.
const originalConsoleError = console.error
let consoleErrorSpy: jest.SpyInstance
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // React's printWarning passes the template with literal "%s" placeholders
    // as args[0] and the interpolated values ("fetchPriority", ...) as later
    // args, so the check has to scan every arg, not just the first.
    if (args.some((arg) => typeof arg === "string" && arg.includes("fetchPriority"))) return
    originalConsoleError(...args)
  }
})
afterAll(() => {
  console.error = originalConsoleError
})

// Simulates a chunk that 404s right after a deploy replaced .next/static:
// the dynamic import() rejects instead of resolving a module.
jest.mock("@/components/sections/LiquidEther", () => {
  throw new Error("chunk 404")
})

import { HeroBackground } from "@/components/sections/hero-background"

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void
const observers: IOCallback[] = []

beforeEach(() => {
  observers.length = 0
  global.IntersectionObserver = class {
    constructor(cb: IOCallback) {
      observers.push(cb)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  window.matchMedia = jest.fn((query: string) => ({ matches: false })) as unknown as typeof window.matchMedia
  delete (navigator as { connection?: unknown }).connection
  consoleErrorSpy = jest.spyOn(console, "error")
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

async function flushEffects(): Promise<void> {
  await act(async () => {})
}

describe("HeroBackground chunk failure", () => {
  it("keeps the page alive and the snapshot visible when the fluid chunk fails to load", async () => {
    const { container } = render(<HeroBackground />)
    await flushEffects()

    act(() => {
      window.dispatchEvent(new Event("pointermove"))
    })
    await flushEffects()

    expect(container.querySelector("canvas")).toBeNull()
    const picture = container.querySelector("picture[data-hero-snapshot]")
    expect(picture).toHaveClass("opacity-100")

    // Only the filtered fetchPriority warning is allowed through; anything
    // else means the rejected import() escaped the .catch() fallback.
    const unexpectedCalls = consoleErrorSpy.mock.calls.filter(
      (args) => !args.some((arg: unknown) => typeof arg === "string" && arg.includes("fetchPriority")),
    )
    expect(unexpectedCalls).toEqual([])
  })
})

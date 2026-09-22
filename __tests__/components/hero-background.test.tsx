/** @jest-environment jsdom */
import { act, render, screen } from "@testing-library/react"

// react-dom 18.3 (jest) predates fetchPriority; the app router renders with
// Next's React canary, which supports it. Silence only that one warning.
const originalConsoleError = console.error
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

// Stand-in for the WebGL component: exposes the props we care about and
// lets a test fire onReady by clicking it.
jest.mock("@/components/sections/LiquidEther", () => ({
  __esModule: true,
  default: (props: { iterationsViscous: number; maxPixelRatio: number; onReady: () => void }) => (
    <canvas
      data-testid="liquid-ether"
      data-iterations={props.iterationsViscous}
      data-max-dpr={props.maxPixelRatio}
      onClick={props.onReady}
    />
  ),
}))

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
  setMedia([])
  delete (navigator as { connection?: unknown }).connection
})

function setMedia(matching: string[]): void {
  window.matchMedia = jest.fn((query: string) => ({ matches: matching.includes(query) })) as unknown as typeof window.matchMedia
}

async function flushEffects(): Promise<void> {
  await act(async () => {})
}

function gesture(type = "pointermove"): void {
  act(() => {
    window.dispatchEvent(new Event(type))
  })
}

function setHeroVisible(isIntersecting: boolean): void {
  act(() => {
    observers.forEach((cb) => cb([{ isIntersecting }]))
  })
}

describe("HeroBackground", () => {
  it("renders the snapshot picture and no canvas before any gesture", async () => {
    const { container } = render(<HeroBackground />)
    const img = container.querySelector("picture[data-hero-snapshot] img")
    expect(img).toHaveAttribute("src", "/hero/liquid-ether-landscape.webp")
    expect(img).toHaveAttribute("alt", "")
    expect(container.querySelector("picture source")).toHaveAttribute("media", "(orientation: portrait)")
    expect(container.querySelector("picture source")).toHaveAttribute("srcset", "/hero/liquid-ether-portrait.webp")
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
  })

  it("mounts the fluid after the first gesture and fades the snapshot once it is ready", async () => {
    const { container } = render(<HeroBackground />)
    await flushEffects()
    gesture()
    const canvas = await screen.findByTestId("liquid-ether")
    expect(canvas).toHaveAttribute("data-iterations", "32")
    expect(canvas).toHaveAttribute("data-max-dpr", "2")
    const picture = container.querySelector("picture[data-hero-snapshot]")
    expect(picture).toHaveClass("opacity-100")
    act(() => {
      canvas.click()
    })
    expect(picture).toHaveClass("opacity-0")
  })

  it("uses the reduced quality on coarse pointers", async () => {
    setMedia(["(pointer: coarse)"])
    render(<HeroBackground />)
    await flushEffects()
    gesture("touchstart")
    const canvas = await screen.findByTestId("liquid-ether")
    expect(canvas).toHaveAttribute("data-iterations", "16")
    expect(canvas).toHaveAttribute("data-max-dpr", "1.5")
  })

  it.each([
    ["prefers-reduced-motion", () => setMedia(["(prefers-reduced-motion: reduce)"])],
    ["save-data", () => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true })],
  ])("never loads the fluid under %s", async (_label, arrange) => {
    arrange()
    render(<HeroBackground />)
    await flushEffects()
    gesture()
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
  })

  it("ignores gestures while the hero is out of view and accepts one once it is back", async () => {
    render(<HeroBackground />)
    await flushEffects()
    setHeroVisible(false)
    gesture("wheel")
    await flushEffects()
    expect(screen.queryByTestId("liquid-ether")).toBeNull()
    setHeroVisible(true)
    gesture("wheel")
    expect(await screen.findByTestId("liquid-ether")).toBeInTheDocument()
  })
})

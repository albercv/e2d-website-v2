/** @jest-environment jsdom */

import { render, act } from "@testing-library/react"
import "@testing-library/jest-dom"

// next/script injects tags asynchronously via effects; a plain <script> keeps
// the assertions about *what* is rendered (src, inline init) deterministic.
jest.mock("next/script", () => ({
  __esModule: true,
  default: ({ children, src, id }: { children?: string; src?: string; id?: string }) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- test stub, not shipped
    <script data-testid={id ?? "sdk"} src={src}>{children}</script>
  ),
}))

import { OpenAIPixel } from "@/components/analytics/openai-pixel"

const PIXEL_ID = "PIXEL_TEST_123"

function setConsent(marketing: boolean): void {
  localStorage.setItem("cookie-consent", JSON.stringify({ necessary: true, analytics: true, marketing }))
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const prev: Record<string, string | undefined> = {}
  for (const k of Object.keys(overrides)) {
    prev[k] = process.env[k]
    if (overrides[k] === undefined) delete process.env[k]
    else process.env[k] = overrides[k]
  }
  try {
    fn()
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k]
      else process.env[k] = prev[k]
    }
  }
}

const prodEnv = { NODE_ENV: "production", NEXT_PUBLIC_OAIQ_PIXEL_ID: PIXEL_ID }

describe("OpenAIPixel", () => {
  beforeEach(() => localStorage.clear())

  it("renders nothing without marketing consent", () => {
    withEnv(prodEnv, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
    })
  })

  it("renders nothing when consent explicitly denies marketing", () => {
    setConsent(false)
    withEnv(prodEnv, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
    })
  })

  it("renders nothing when the pixel id env is missing", () => {
    setConsent(true)
    withEnv({ NODE_ENV: "production", NEXT_PUBLIC_OAIQ_PIXEL_ID: undefined }, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
    })
  })

  it("renders nothing outside production", () => {
    setConsent(true)
    withEnv({ NODE_ENV: "test", NEXT_PUBLIC_OAIQ_PIXEL_ID: PIXEL_ID }, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
    })
  })

  it("injects the init snippet and the SDK once marketing consent is granted", () => {
    setConsent(true)
    withEnv(prodEnv, () => {
      const { container } = render(<OpenAIPixel />)
      const scripts = container.querySelectorAll("script")
      expect(scripts).toHaveLength(2)
      const init = container.querySelector('script[data-testid="oaiq-init"]')
      expect(init?.textContent).toContain(`pixelId: "${PIXEL_ID}"`)
      expect(init?.textContent).toContain("window.oaiq = window.oaiq ||")
      const sdk = container.querySelector('script[src="https://bzrcdn.openai.com/sdk/oaiq.min.js"]')
      expect(sdk).not.toBeNull()
    })
  })

  it("loads in the same session when the banner dispatches cookie-consent-changed", () => {
    withEnv(prodEnv, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
      setConsent(true)
      act(() => {
        window.dispatchEvent(new Event("cookie-consent-changed"))
      })
      expect(container.querySelectorAll("script")).toHaveLength(2)
    })
  })

  it("treats malformed consent JSON as no consent", () => {
    localStorage.setItem("cookie-consent", "{not json")
    withEnv(prodEnv, () => {
      const { container } = render(<OpenAIPixel />)
      expect(container.querySelector("script")).toBeNull()
    })
  })
})

/** @jest-environment jsdom */
import { render } from "@testing-library/react"
import * as ReactActual from "react"

jest.mock("next/navigation", () => ({ usePathname: () => "/es" }))
jest.mock("next/script", () => ({
  __esModule: true,
  default: ({ src, strategy }: { src?: string; strategy?: string }) => (
    <script data-testid="gtag" data-strategy={strategy} src={src} />
  ),
}))

// The measurement id is read at module load, so the module is required
// inside an isolated registry after the env is set. jest.isolateModules
// hands every transitively-required module a brand new instance -- including
// "react" -- so the freshly-required component's hooks would read from a
// *different* react than the one react-dom (loaded once, at file scope, via
// the `render` import above) already wired its dispatcher to, crashing with
// a null dispatcher ("Cannot read properties of null (reading 'useRef')")
// before the strategy assertion ever runs. Pinning "react" inside the
// isolated registry to the already-loaded instance keeps hooks working while
// still letting the component's module-scope GA_MEASUREMENT_ID constant
// re-read the new env value.
function loadGoogleAnalytics(): () => JSX.Element | null {
  let component: (() => JSX.Element | null) | undefined
  jest.isolateModules(() => {
    jest.doMock("react", () => ReactActual)
    component = require("@/components/analytics/google-analytics").GoogleAnalytics
  })
  return component as () => JSX.Element | null
}

describe("GoogleAnalytics", () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: "production", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST" }
    window.dataLayer = []
  })

  afterEach(() => {
    process.env = env
  })

  it("loads gtag.js after window load and queues js/consent/config before it arrives", () => {
    const GoogleAnalytics = loadGoogleAnalytics()
    const { getByTestId } = render(<GoogleAnalytics />)
    expect(getByTestId("gtag")).toHaveAttribute("data-strategy", "lazyOnload")
    expect(getByTestId("gtag")).toHaveAttribute("src", "https://www.googletagmanager.com/gtag/js?id=G-TEST")
    const commands = window.dataLayer.map((args) => Array.from(args as ArrayLike<unknown>)[0])
    // Pre-existing, out-of-scope bug (unrelated to the strategy change this
    // task makes): the pathname-tracking effect's "skip the first render"
    // guard never actually blocks, because both useEffect hooks fire in the
    // same initial-mount commit -- initialMountDone.current is already true
    // (set at the end of the first effect) by the time the second effect
    // checks it, so an extra "event" push always fires on mount. Asserting
    // the real, current behavior here rather than the guard's intended one;
    // see task-11-report.md for details and the flagged follow-up.
    expect(commands).toEqual(["js", "consent", "config", "event"])
  })
})

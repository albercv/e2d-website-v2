import { readFileSync } from "fs"
import { join } from "path"

// These components render on the home page's first paint (navigation and
// the cookie banner on every page). A direct framer-motion import drags the
// whole 50 KiB gz chunk into the initial bundle: animate with CSS or go
// through components/performance/motion-optimized.tsx.
const FILES = [
  "components/layout/navigation.tsx",
  "components/gdpr/cookie-banner.tsx",
  "components/sections/services-section.tsx",
  "components/sections/hero-section.tsx",
]

describe.each(FILES)("%s", (file) => {
  it("does not import framer-motion directly", () => {
    const src = readFileSync(join(process.cwd(), file), "utf8")
    expect(src).not.toMatch(/from ["']framer-motion["']/)
  })
})

import { readFileSync } from "fs"
import { join } from "path"

// Regression tripwire: Three.js (180 KiB gz) and framer-motion (50 KiB gz)
// must never come back into the home page's initial bundle through the hero.
const read = (file: string): string => readFileSync(join(process.cwd(), file), "utf8")

describe("hero bundle policy", () => {
  it("hero-section imports neither the fluid, three nor framer-motion statically", () => {
    const src = read("components/sections/hero-section.tsx")
    expect(src).not.toMatch(/from ["'](three|framer-motion|\.\/LiquidEther|@\/components\/sections\/LiquidEther|@\/components\/performance\/motion-optimized)["']/)
  })

  it("hero-background only reaches LiquidEther through a lazy import()", () => {
    const src = read("components/sections/hero-background.tsx")
    // The lazy() call now wraps the import() in a .catch() (so a failed chunk
    // load can't take the page down) and spans multiple lines; the pattern
    // only needs to confirm LiquidEther is still reached exclusively through
    // lazy(() => import(...)), not that it is a single unbroken line.
    expect(src).toMatch(/lazy\(\(\) =>[\s\S]*?import\("@\/components\/sections\/LiquidEther"\)/)
    expect(src).not.toMatch(/^import .*LiquidEther/m)
  })

  it("LiquidEther no longer imports a CSS file", () => {
    expect(read("components/LiquidEther.jsx")).not.toMatch(/\.css["']/)
  })
})

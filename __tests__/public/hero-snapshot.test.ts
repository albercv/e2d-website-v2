import { statSync } from "fs"
import { join } from "path"

// The hero paints these on first load with fetchpriority=high: keep them
// small. Regenerate with `node scripts/capture-hero-snapshot.js <url>`.
const MAX_BYTES = 60 * 1024

describe.each(["landscape", "portrait"])("hero snapshot (%s)", (variant) => {
  const file = join(process.cwd(), "public", "hero", `liquid-ether-${variant}.webp`)

  it("exists and stays under the byte budget", () => {
    const { size } = statSync(file)
    expect(size).toBeGreaterThan(1024)
    expect(size).toBeLessThan(MAX_BYTES)
  })
})

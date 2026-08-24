/** @jest-environment node */
import { readFileSync } from "fs"
import nextConfig from "../../next.config.mjs"

const src = readFileSync("next.config.mjs", "utf8")

describe("security headers", () => {
  it.each([
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy-Report-Only",
  ])("declares %s", (header) => {
    expect(src).toContain(header)
  })

  it("does not enforce CSP yet", () => {
    expect(src).not.toMatch(/key:\s*["']Content-Security-Policy["']/)
  })

  it("returns the 6 security headers for all paths via headers()", async () => {
    const rules = await nextConfig.headers()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe("/:path*")

    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).toEqual([
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy-Report-Only",
    ])
  })
})

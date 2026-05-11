/**
 * @jest-environment node
 *
 * Tests for sitemap correctness: docs slugs match actual valid routes,
 * no fabricated 404 docs URLs, and lastModified is stable (not new Date()).
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string
let mod: typeof import("../../lib/sitemap-generator")

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-docs-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
  mod = require("../../lib/sitemap-generator")
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
  delete process.env.BUILD_TIME
})

describe("docs pages in sitemap", () => {
  it("does NOT emit /docs/security for any locale — that route returns 404", async () => {
    const sitemap = await mod.generateAISitemap()
    const securityUrls = sitemap
      .map((e: any) => e.url)
      .filter((u: string) => u.includes("/docs/security"))
    expect(securityUrls).toEqual([])
  })

  it("emits valid docs slugs: principles, architecture, components, i18n, seo, gdpr, performance, deployment", async () => {
    const validSlugs = ["principles", "architecture", "components", "i18n", "seo", "gdpr", "performance", "deployment"]
    const sitemap = await mod.generateAISitemap()
    const docUrls = sitemap
      .map((e: any) => e.url)
      .filter((u: string) => /\/docs\/[a-z0-9-]+$/.test(u))

    for (const slug of validSlugs) {
      for (const locale of ["es", "en", "it"]) {
        expect(docUrls).toContain(`https://evolve2digital.com/${locale}/docs/${slug}`)
      }
    }
  })

  it("emits docs entries for all three locales", async () => {
    const sitemap = await mod.generateAISitemap()
    const docUrls = sitemap
      .map((e: any) => e.url)
      .filter((u: string) => /\/docs\/[a-z0-9-]+$/.test(u))

    const esCount = docUrls.filter((u: string) => u.startsWith("https://evolve2digital.com/es/docs/")).length
    const enCount = docUrls.filter((u: string) => u.startsWith("https://evolve2digital.com/en/docs/")).length
    const itCount = docUrls.filter((u: string) => u.startsWith("https://evolve2digital.com/it/docs/")).length

    expect(esCount).toBe(enCount)
    expect(enCount).toBe(itCount)
    expect(esCount).toBeGreaterThan(0)
  })
})

describe("lastModified stability", () => {
  it("homepage lastModified is not the current time (stable across calls)", async () => {
    const before = Date.now()
    const sitemap1 = await mod.generateAISitemap()
    const home1 = sitemap1.find((e: any) => e.url === "https://evolve2digital.com/es")
    const ts1 = new Date(home1!.lastModified as any).getTime()

    // Wait a tick then call again
    await new Promise(r => setTimeout(r, 10))

    jest.resetModules()
    const runtime = require("../../lib/blog/posts-runtime")
    runtime.clearPostsRuntimeCache()
    const mod2: typeof mod = require("../../lib/sitemap-generator")
    const sitemap2 = await mod2.generateAISitemap()
    const home2 = sitemap2.find((e: any) => e.url === "https://evolve2digital.com/es")
    const ts2 = new Date(home2!.lastModified as any).getTime()

    // Both calls must produce the same timestamp — not "now"
    expect(ts1).toBe(ts2)
    // And it must not be the time this test ran (i.e. not new Date() at call time)
    expect(ts1).toBeLessThan(before + 100)
  })

  it("docs lastModified is stable and not new Date() at call time", async () => {
    const before = Date.now()
    const sitemap = await mod.generateAISitemap()
    const docsEntry = sitemap.find((e: any) => e.url === "https://evolve2digital.com/es/docs/principles")
    expect(docsEntry).toBeDefined()
    const ts = new Date(docsEntry!.lastModified as any).getTime()
    // Must be a real date in the past, not generated at test-run time
    expect(ts).toBeLessThan(before)
  })
})

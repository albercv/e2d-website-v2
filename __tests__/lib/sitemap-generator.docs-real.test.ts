/**
 * @jest-environment node
 *
 * Tests for sitemap correctness: no docs URLs (internal docs are noindex),
 * no fabricated 404 URLs, and lastModified is stable (not new Date()).
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

  it("emits no docs URL for any locale: internal docs are noindex, so they are not sitemapped", async () => {
    // Docs are publicly reachable but kept out of search results (audit
    // 2026-10-20). Listing them in the sitemap would contradict noindex.
    const sitemap = await mod.generateAISitemap()
    const docUrls = sitemap
      .map((e: any) => e.url)
      .filter((u: string) => /\/docs(\/|$)/.test(u))

    expect(docUrls).toEqual([])
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

  it("legal lastModified is stable and not new Date() at call time", async () => {
    // Legal pages share the stable date that docs entries used before noindex.
    const before = Date.now()
    const sitemap = await mod.generateAISitemap()
    const legalEntry = sitemap.find((e: any) => e.url === "https://evolve2digital.com/es/legal")
    expect(legalEntry).toBeDefined()
    const ts = new Date(legalEntry!.lastModified as any).getTime()
    // Must be a real date in the past, not generated at test-run time
    expect(ts).toBeLessThan(before)
  })
})

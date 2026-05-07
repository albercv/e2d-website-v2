/**
 * @jest-environment node
 *
 * Tests for lib/sitemap-generator.ts after migration from contentlayer to
 * runtime reader (listPostsFromDisk). The generator must read posts from disk
 * via CONTENT_ROOT and emit URLs for the blog posts found there. No build
 * step.
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string
let mod: typeof import("../../lib/sitemap-generator")

const writeMdx = (rel: string, body: string) => {
  const full = path.join(tmp, "content", rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, body, "utf-8")
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-gen-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  // Re-require both modules so the runtime cache is fresh per test.
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
  mod = require("../../lib/sitemap-generator")
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("generateAISitemap (runtime, async)", () => {
  it("includes a blog post URL for a post on disk without contentlayer", async () => {
    writeMdx(
      "posts/hello.mdx",
      `---
title: Hello World
description: short description
date: 2026-05-04
locale: es
slug: hello
published: true
---

body body body
`,
    )

    const sitemap = await mod.generateAISitemap()
    const urls = sitemap.map((e: any) => e.url)
    expect(urls).toContain("https://evolve2digital.com/es/blog/hello")
  })

  it("excludes unpublished posts", async () => {
    writeMdx(
      "posts/draft.mdx",
      `---
title: Draft
description: short description
date: 2026-05-04
locale: es
slug: draft
published: false
---

body
`,
    )
    writeMdx(
      "posts/live.mdx",
      `---
title: Live
description: short description
date: 2026-05-04
locale: en
slug: live
published: true
---

body
`,
    )

    const sitemap = await mod.generateAISitemap()
    const urls = sitemap.map((e: any) => e.url)
    expect(urls).toContain("https://evolve2digital.com/en/blog/live")
    expect(urls).not.toContain("https://evolve2digital.com/es/blog/draft")
  })

  it("includes static homepage and blog index entries for all locales", async () => {
    const sitemap = await mod.generateAISitemap()
    const urls = sitemap.map((e: any) => e.url)
    expect(urls).toContain("https://evolve2digital.com/es")
    expect(urls).toContain("https://evolve2digital.com/en")
    expect(urls).toContain("https://evolve2digital.com/it")
    expect(urls).toContain("https://evolve2digital.com/es/blog")
    expect(urls).toContain("https://evolve2digital.com/en/blog")
    expect(urls).toContain("https://evolve2digital.com/it/blog")
  })

  it("uses post.date as lastModified for blog post entries", async () => {
    writeMdx(
      "posts/dated.mdx",
      `---
title: Dated
description: short description
date: 2024-01-15
locale: en
slug: dated
published: true
---

body
`,
    )

    const sitemap = await mod.generateAISitemap()
    const entry = sitemap.find(
      (e: any) => e.url === "https://evolve2digital.com/en/blog/dated",
    )
    expect(entry).toBeDefined()
    const last = new Date(entry!.lastModified as any)
    expect(last.toISOString().slice(0, 10)).toBe("2024-01-15")
  })

  it("returns empty post entries when the content directory has no posts", async () => {
    const sitemap = await mod.generateAISitemap()
    // Static + docs + legal pages are still present, no blog post slugs.
    const blogPostUrls = sitemap
      .map((e: any) => e.url)
      .filter((u: string) => /\/blog\/[a-z0-9-]+$/.test(u))
    expect(blogPostUrls).toEqual([])
  })
})

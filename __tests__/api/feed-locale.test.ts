/**
 * @jest-environment node
 *
 * Tests for the dynamic RSS feed route at app/feed/[locale]/route.ts.
 * Replaces the static public/rss-{locale}.xml files generated at build time —
 * the feed is now produced at request time from the runtime post reader.
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string
let route: typeof import("../../app/feed/[locale]/route")

const writeMdx = (rel: string, body: string) => {
  const full = path.join(tmp, "content", rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, body, "utf-8")
}

const seedPosts = () => {
  writeMdx(
    "posts/es-post.mdx",
    `---
title: Post Español
description: descripción suficiente
date: 2026-05-01
locale: es
slug: es-post
author: Alberto Carrasco
published: true
tags: [ia, automatización]
---

contenido en español
`,
  )
  writeMdx(
    "posts/en-post.mdx",
    `---
title: English Post
description: english description long enough
date: 2026-04-30
locale: en
slug: en-post
author: Alberto Carrasco
published: true
---

english content
`,
  )
  writeMdx(
    "posts/it-post.mdx",
    `---
title: Post Italiano
description: descrizione sufficientemente lunga
date: 2026-04-29
locale: it
slug: it-post
author: Alberto Carrasco
published: true
---

contenuto in italiano
`,
  )
  writeMdx(
    "posts/draft.mdx",
    `---
title: Draft
description: drafty description sufficient length
date: 2026-04-28
locale: es
slug: draft
author: Alberto Carrasco
published: false
---

draft body
`,
  )
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "feed-route-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
  route = require("../../app/feed/[locale]/route")
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("/feed/[locale]", () => {
  it("returns 200 with application/rss+xml for the es locale", async () => {
    seedPosts()
    const req = new Request("https://evolve2digital.com/feed/es")
    const res = await route.GET(req as any, { params: { locale: "es" } })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type") || "").toContain("application/rss+xml")
    const body = await res.text()
    expect(body).toContain("<?xml")
    expect(body).toContain("<rss")
    expect(body).toContain("Post Español")
  })

  it("filters items to the requested locale only", async () => {
    seedPosts()
    const req = new Request("https://evolve2digital.com/feed/en")
    const res = await route.GET(req as any, { params: { locale: "en" } })
    const body = await res.text()
    expect(body).toContain("English Post")
    expect(body).not.toContain("Post Español")
    expect(body).not.toContain("Post Italiano")
  })

  it("excludes unpublished posts from the feed", async () => {
    seedPosts()
    const req = new Request("https://evolve2digital.com/feed/es")
    const res = await route.GET(req as any, { params: { locale: "es" } })
    const body = await res.text()
    expect(body).not.toContain("Draft")
  })

  it("returns 404 for an invalid locale", async () => {
    seedPosts()
    const req = new Request("https://evolve2digital.com/feed/fr")
    const res = await route.GET(req as any, { params: { locale: "fr" } })
    expect(res.status).toBe(404)
  })

  it("emits RFC 2822 pubDate values for items", async () => {
    seedPosts()
    const req = new Request("https://evolve2digital.com/feed/it")
    const res = await route.GET(req as any, { params: { locale: "it" } })
    const body = await res.text()
    // RFC 2822 format ends in GMT for UTC dates from toUTCString()
    const pubDates = body.match(/<pubDate>([^<]+)<\/pubDate>/g) || []
    expect(pubDates.length).toBeGreaterThan(0)
    pubDates.forEach((d) => expect(d).toMatch(/GMT<\/pubDate>$/))
  })
})

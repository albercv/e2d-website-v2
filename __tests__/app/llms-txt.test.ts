/**
 * @jest-environment node
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string

const writeMdx = (rel: string, body: string) => {
  const full = path.join(tmp, "content", rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, body, "utf-8")
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "llms-txt-"))
  fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
  process.env.CONTENT_ROOT = tmp
  jest.resetModules()
  const runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("GET /llms.txt", () => {
  it("returns text/plain with site title, description and a Blog section listing published posts", async () => {
    writeMdx("posts/draft.mdx", `---
title: Draft post
description: should not appear
date: 2026-05-01
locale: es
slug: draft
published: false
---
body`)
    writeMdx("posts/published.mdx", `---
title: Published post
description: a real post
date: 2026-05-02
locale: es
slug: published
published: true
---
body`)

    const { GET } = require("../../app/llms.txt/route")
    const res: Response = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/plain")

    const body = await res.text()
    expect(body).toMatch(/^# E2D — Evolve2Digital/m)
    expect(body).toContain("## Blog")
    expect(body).toContain("/es/blog/published")
    expect(body).not.toContain("/es/blog/draft")
  })
})

describe("GET /llms-full.txt", () => {
  it("returns the full markdown body of published posts and skips drafts", async () => {
    writeMdx("posts/draft.mdx", `---
title: Draft
date: 2026-05-01
locale: es
slug: draft
published: false
---
DRAFT_BODY`)
    writeMdx("posts/p1.mdx", `---
title: First
date: 2026-05-05
locale: es
slug: first
published: true
---
FIRST_BODY`)
    writeMdx("posts/p2.mdx", `---
title: Second
date: 2026-05-04
locale: es
slug: second
published: true
---
SECOND_BODY`)

    const { GET } = require("../../app/llms-full.txt/route")
    const res: Response = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/plain")

    const body = await res.text()
    expect(body).toContain("FIRST_BODY")
    expect(body).toContain("SECOND_BODY")
    expect(body).not.toContain("DRAFT_BODY")
    // Newest first (date desc)
    expect(body.indexOf("FIRST_BODY")).toBeLessThan(body.indexOf("SECOND_BODY"))
    // Each entry preceded by a metadata header
    expect(body).toMatch(/^# First/m)
    expect(body).toContain("https://evolve2digital.com/es/blog/first")
  })
})

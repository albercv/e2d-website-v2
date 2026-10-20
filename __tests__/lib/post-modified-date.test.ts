/**
 * @jest-environment node
 *
 * Audit 2026-10-20: BlogPosting.dateModified and Open Graph modifiedTime must
 * reflect a real edit date (frontmatter `updated`) and fall back to the
 * publication date, never to a made-up value. Posts live in a tmp dir; the
 * production volume is never read.
 */
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

let tmpDir: string
let runtime: typeof import("../../lib/blog/posts-runtime")

const writePost = async (slug: string, extra: string) => {
  const full = path.join(tmpDir, "content", "posts", `${slug}.mdx`)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(
    full,
    `---
title: ${slug}
description: Descripcion suficientemente larga para validar el campo
date: 2026-05-04
locale: es
slug: ${slug}
published: true
${extra}
---

body body body
`,
    "utf-8",
  )
}

const schemaFor = async (slug: string) => {
  const { JsonLdGenerator, defaultJsonLdConfig } = require("../../lib/json-ld-generator")
  const posts = await runtime.listPostsFromDisk()
  const post = posts.find((p) => p.slug === slug)
  expect(post).toBeDefined()
  const generator = new JsonLdGenerator(defaultJsonLdConfig)
  const data = JsonLdGenerator.fromContentlayerPost(post!, "https://evolve2digital.com")
  return generator.generateBlogPostSchema(data) as { datePublished: string; dateModified: string }
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "post-modified-"))
  process.env.CONTENT_ROOT = tmpDir
  jest.resetModules()
  runtime = require("../../lib/blog/posts-runtime")
  runtime.clearPostsRuntimeCache()
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("BlogPosting dateModified", () => {
  it("is the `updated` date when the post declares one", async () => {
    await writePost("with-updated", "updated: 2026-10-20")
    const schema = await schemaFor("with-updated")
    expect(schema.dateModified).toBe("2026-10-20")
    expect(schema.datePublished).toBe("2026-05-04")
  })

  it("falls back to the publication date without `updated`", async () => {
    await writePost("plain", "")
    const schema = await schemaFor("plain")
    expect(schema.dateModified).toBe("2026-05-04")
  })

  it("falls back to the publication date when `updated` is invalid", async () => {
    await writePost("invalid", "updated: not-a-date")
    const schema = await schemaFor("invalid")
    expect(schema.dateModified).toBe("2026-05-04")
  })
})

describe("postModifiedDate", () => {
  it("prefers `updated` over `date`", () => {
    const { postModifiedDate } = require("../../lib/blog/post-dates")
    expect(postModifiedDate({ date: "2026-05-04", updated: "2026-10-20" })).toBe("2026-10-20")
    expect(postModifiedDate({ date: "2026-05-04" })).toBe("2026-05-04")
  })
})

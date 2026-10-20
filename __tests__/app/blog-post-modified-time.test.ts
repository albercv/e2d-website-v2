/**
 * @jest-environment node
 *
 * Audit 2026-10-20: the Open Graph `article:modified_time` of a blog post must
 * come from the frontmatter `updated` date and fall back to the publication
 * date. Posts live in a tmp dir; the production volume is never read.
 */
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

// The page only needs its metadata function here; the UI shell is irrelevant.
jest.mock("@/components/blog/blog-post", () => ({ BlogPost: () => null }))
jest.mock("@/components/layout/navigation", () => ({ Navigation: () => null }))
jest.mock("@/components/layout/footer", () => ({ Footer: () => null }))
jest.mock("@/components/layout/locale-alternates-context", () => ({
  LocaleAlternatesProvider: ({ children }: { children: unknown }) => children,
}))

let tmpDir: string

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

const openGraphOf = async (slug: string) => {
  const { generateMetadata } = require("@/app/[locale]/blog/[slug]/page")
  const metadata = await generateMetadata({ params: Promise.resolve({ locale: "es", slug }) })
  return metadata.openGraph as { publishedTime: string; modifiedTime: string }
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "post-og-modified-"))
  process.env.CONTENT_ROOT = tmpDir
  jest.resetModules()
  require("@/lib/blog/posts-runtime").clearPostsRuntimeCache()
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
  delete process.env.CONTENT_ROOT
})

describe("blog post Open Graph modifiedTime", () => {
  it("uses `updated` when the post declares one", async () => {
    await writePost("with-updated", "updated: 2026-10-20")
    const og = await openGraphOf("with-updated")
    expect(og.modifiedTime).toBe("2026-10-20")
    expect(og.publishedTime).toBe("2026-05-04")
  })

  it("falls back to the publication date without `updated`", async () => {
    await writePost("plain", "")
    const og = await openGraphOf("plain")
    expect(og.modifiedTime).toBe("2026-05-04")
  })
})

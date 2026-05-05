// __tests__/lib/translation-key.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import {
  findPostsByTranslationKey,
  getTranslationKeyForSlug,
} from "@/lib/blog/translation-key"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

const FRONTMATTER = (slug: string, locale: string, key?: string) => `---
slug: ${slug}
title: Title ${slug}
date: 2026-05-05
locale: ${locale}
${key ? `translationKey: ${key}` : ""}
---
Body for ${slug} ${locale}.
`

describe("translation-key", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tk-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
  })

  it("groups posts that share an explicit translationKey", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy-es.mdx"),
      FRONTMATTER("ferdy-es", "es", "ferdy-2026")
    )
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy-en.mdx"),
      FRONTMATTER("ferdy-en", "en", "ferdy-2026")
    )
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "alone.mdx"),
      FRONTMATTER("alone", "es")
    )

    const siblings = await findPostsByTranslationKey("ferdy-2026")
    expect(siblings.map((p) => p.slug).sort()).toEqual(["ferdy-en", "ferdy-es"])
  })

  it("falls back to slug as translationKey when frontmatter is absent", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "alone.mdx"),
      FRONTMATTER("alone", "es")
    )
    const siblings = await findPostsByTranslationKey("alone")
    expect(siblings.map((p) => p.slug)).toEqual(["alone"])
  })

  it("getTranslationKeyForSlug returns explicit key, else slug", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy-es.mdx"),
      FRONTMATTER("ferdy-es", "es", "ferdy-2026")
    )
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "alone.mdx"),
      FRONTMATTER("alone", "es")
    )
    expect(await getTranslationKeyForSlug("ferdy-es", "es")).toBe("ferdy-2026")
    expect(await getTranslationKeyForSlug("alone", "es")).toBe("alone")
    expect(await getTranslationKeyForSlug("missing", "es")).toBeNull()
  })
})

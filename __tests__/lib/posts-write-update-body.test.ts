// __tests__/lib/posts-write-update-body.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { updatePostBody } from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("updatePostBody", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
  })

  it("rewrites the body and keeps the frontmatter intact", async () => {
    const original = `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

Old body
`
    fs.writeFileSync(path.join(tmp, "content", "posts", "ferdy.mdx"), original)
    await updatePostBody({ slug: "ferdy", locale: "es", content: "New body with [image:foo]" })
    const written = fs.readFileSync(path.join(tmp, "content", "posts", "ferdy.mdx"), "utf-8")
    expect(written).toContain("translationKey: ferdy-2026")
    expect(written).toContain("New body with [image:foo]")
    expect(written).not.toContain("Old body")
  })

  it("rejects when post does not exist", async () => {
    await expect(
      updatePostBody({ slug: "ghost", locale: "es", content: "x" })
    ).rejects.toThrow(/not found/i)
  })
})

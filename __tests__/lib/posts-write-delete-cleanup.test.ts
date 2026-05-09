// __tests__/lib/posts-write-delete-cleanup.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { createPost, deletePost } from "@/lib/blog/posts-write"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("deletePost — uploads cleanup", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "del-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    fs.mkdirSync(path.join(tmp, "uploads"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    process.env.BLOG_POSTS_DIR = path.join(tmp, "content", "posts")
    process.env.MEDIA_UPLOADS_ROOT = path.join(tmp, "uploads")
    clearPostsRuntimeCache()
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
    delete process.env.BLOG_POSTS_DIR
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("removes the uploads dir when deleting the last sibling", async () => {
    await createPost({
      title: "Solo",
      description: "post solo description",
      content: "x".repeat(60),
      locale: "es",
      tags: [],
      translationKey: "ferdy-2026",
    })
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"))
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", { fachada: { ext: "jpg", kind: "image", alt: "", caption: "" } })

    await deletePost({ slug: "solo", locale: "es", confirm: true, cleanupMedia: true })
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-2026"))).toBe(false)
  })

  it("keeps the uploads dir when other siblings remain", async () => {
    await createPost({
      title: "ES post",
      description: "es post description",
      content: "x".repeat(60),
      locale: "es",
      tags: [],
      translationKey: "ferdy-2026",
    })
    await createPost({
      title: "EN post",
      description: "en post description",
      content: "x".repeat(60),
      locale: "en",
      tags: [],
      translationKey: "ferdy-2026",
    })
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"))
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", { fachada: { ext: "jpg", kind: "image", alt: "", caption: "" } })

    await deletePost({ slug: "es-post", locale: "es", confirm: true, cleanupMedia: true })
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-2026"))).toBe(true)
  })

  it("preserves uploads dir when cleanupMedia is false (default)", async () => {
    await createPost({
      title: "Solo preserve",
      description: "post solo preserve description",
      content: "x".repeat(60),
      locale: "es",
      tags: [],
      translationKey: "ferdy-preserve",
    })
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-preserve"))
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-preserve", "hero.png"), "binary")
    await writeMeta("ferdy-preserve", { hero: { ext: "png", kind: "image", alt: "", caption: "" } })

    // Sin cleanupMedia (default false) — el dir sobrevive aunque sea último sibling
    const result = await deletePost({ slug: "solo-preserve", locale: "es", confirm: true })
    expect(result.mediaCleanedUp).toBe(false)
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-preserve"))).toBe(true)
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-preserve", "hero.png"))).toBe(true)
  })
})

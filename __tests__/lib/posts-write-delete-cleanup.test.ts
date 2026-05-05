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
    process.env.MEDIA_UPLOADS_ROOT = path.join(tmp, "uploads")
    clearPostsRuntimeCache()
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
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

    await deletePost({ slug: "solo", locale: "es" })
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

    await deletePost({ slug: "es-post", locale: "es" })
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-2026"))).toBe(true)
  })
})

import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import matter from "gray-matter"
import {
  updatePostFrontmatter,
  isPostsWriteError,
} from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

function seedPost(
  dir: string,
  slug: string,
  locale: "es" | "en" | "it",
  frontmatter: Record<string, unknown>,
  body: string
) {
  const out = matter.stringify(body, frontmatter)
  fs.writeFileSync(path.join(dir, `${slug}.${locale}.mdx`), out, "utf-8")
}

describe("updatePostFrontmatter", () => {
  let sandbox: string
  let postsDir: string
  let mediaRoot: string
  const prevContentRoot = process.env.CONTENT_ROOT
  const prevBlogPostsDir = process.env.BLOG_POSTS_DIR
  const prevMediaRoot = process.env.MEDIA_UPLOADS_ROOT

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "upf-"))
    postsDir = path.join(sandbox, "content", "posts")
    mediaRoot = path.join(sandbox, "uploads")
    fs.mkdirSync(postsDir, { recursive: true })
    fs.mkdirSync(mediaRoot, { recursive: true })
    process.env.CONTENT_ROOT = sandbox
    delete process.env.BLOG_POSTS_DIR
    process.env.MEDIA_UPLOADS_ROOT = mediaRoot
    clearPostsRuntimeCache()
  })

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true })
    if (prevContentRoot === undefined) delete process.env.CONTENT_ROOT
    else process.env.CONTENT_ROOT = prevContentRoot
    if (prevBlogPostsDir === undefined) delete process.env.BLOG_POSTS_DIR
    else process.env.BLOG_POSTS_DIR = prevBlogPostsDir
    if (prevMediaRoot === undefined) delete process.env.MEDIA_UPLOADS_ROOT
    else process.env.MEDIA_UPLOADS_ROOT = prevMediaRoot
    clearPostsRuntimeCache()
  })

  function readPost(slug: string, locale: "es" | "en" | "it") {
    const raw = fs.readFileSync(path.join(postsDir, `${slug}.${locale}.mdx`), "utf-8")
    return matter(raw)
  }

  it("flips published from false to true and leaves body and other fields untouched", async () => {
    const body = "# Hello\n\nThis is the body.\n"
    seedPost(postsDir, "draft-post", "es", {
      title: "Borrador",
      description: "Una descripción suficientemente larga.",
      date: "2026-05-01",
      locale: "es",
      slug: "draft-post",
      tags: ["a"],
      author: "Alberto",
      published: false,
      translationKey: "draft-post",
    }, body)
    clearPostsRuntimeCache()

    const result = await updatePostFrontmatter({ slug: "draft-post", locale: "es", published: true })

    expect(result.ok).toBe(true)
    expect(result.updated).toEqual(["published"])
    expect(result.coverSyncedToMeta).toBe(false)

    const parsed = readPost("draft-post", "es")
    expect(parsed.data.published).toBe(true)
    expect(parsed.data.title).toBe("Borrador")
    expect(parsed.data.description).toBe("Una descripción suficientemente larga.")
    expect(parsed.data.date).toBe("2026-05-01")
    expect(parsed.data.tags).toEqual(["a"])
    expect(parsed.content.trim()).toBe(body.trim())
  })

  it("updates multiple fields atomically", async () => {
    seedPost(postsDir, "p", "es", {
      title: "T", description: "una descripción de prueba", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: false, translationKey: "p",
    }, "x".repeat(60))

    const r = await updatePostFrontmatter({
      slug: "p", locale: "es",
      title: "Nuevo título de prueba",
      tags: ["one", "two"],
      published: true,
    })

    expect(r.updated.sort()).toEqual(["published", "tags", "title"])
    const parsed = readPost("p", "es")
    expect(parsed.data.title).toBe("Nuevo título de prueba")
    expect(parsed.data.tags).toEqual(["one", "two"])
    expect(parsed.data.published).toBe(true)
  })

  it("clears tags when given an empty array", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "una descripción de prueba", date: "2026-01-01",
      locale: "es", slug: "p", tags: ["a", "b"], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")

    const r = await updatePostFrontmatter({ slug: "p", locale: "es", tags: [] })

    expect(r.updated).toEqual(["tags"])
    expect(readPost("p", "es").data.tags).toEqual([])
  })

  it("returns updated=[] without writing when nothing changes", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "una descripción de prueba", date: "2026-01-01",
      locale: "es", slug: "p", tags: ["a"], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")
    const filePath = path.join(postsDir, "p.es.mdx")
    const mtimeBefore = fs.statSync(filePath).mtimeMs

    await new Promise((r) => setTimeout(r, 10))
    const r = await updatePostFrontmatter({
      slug: "p", locale: "es",
      title: "Una",
      published: true,
      tags: ["a"],
    })

    expect(r.updated).toEqual([])
    expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore)
  })

  it("rejects invalid date with invalid_params", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "una descripción de prueba", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")

    await expect(
      updatePostFrontmatter({ slug: "p", locale: "es", date: "2025-13-99" })
    ).rejects.toMatchObject({ code: "invalid_params", details: { field: "date" } })
  })

  it("rejects too-short title with invalid_params", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "una descripción de prueba", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")

    await expect(
      updatePostFrontmatter({ slug: "p", locale: "es", title: "ab" })
    ).rejects.toMatchObject({ code: "invalid_params", details: { field: "title" } })
  })

  it("returns not_found when the post does not exist", async () => {
    await expect(
      updatePostFrontmatter({ slug: "missing", locale: "es", published: true })
    ).rejects.toMatchObject({ code: "not_found" })
  })

  it("rejects unsupported locale", async () => {
    await expect(
      updatePostFrontmatter({ slug: "x", locale: "fr" as unknown as "es", published: true })
    ).rejects.toMatchObject({ code: "unsupported_locale" })
  })

  it("isPostsWriteError narrows correctly", async () => {
    try {
      await updatePostFrontmatter({ slug: "missing", locale: "es", published: true })
      throw new Error("should have thrown")
    } catch (err) {
      expect(isPostsWriteError(err)).toBe(true)
    }
  })
})

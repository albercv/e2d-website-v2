import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import matter from "gray-matter"
import { syncCoverToFrontmatter } from "@/lib/blog/posts-write"
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

function readCover(dir: string, file: string): string | undefined {
  const raw = fs.readFileSync(path.join(dir, file), "utf-8")
  const parsed = matter(raw)
  return parsed.data.cover as string | undefined
}

describe("syncCoverToFrontmatter", () => {
  let sandbox: string
  let postsDir: string
  const prevContentRoot = process.env.CONTENT_ROOT
  const prevBlogPostsDir = process.env.BLOG_POSTS_DIR

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "sync-cover-"))
    postsDir = path.join(sandbox, "content", "posts")
    fs.mkdirSync(postsDir, { recursive: true })
    process.env.CONTENT_ROOT = sandbox
    delete process.env.BLOG_POSTS_DIR
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true })
    if (prevContentRoot === undefined) delete process.env.CONTENT_ROOT
    else process.env.CONTENT_ROOT = prevContentRoot
    if (prevBlogPostsDir === undefined) delete process.env.BLOG_POSTS_DIR
    else process.env.BLOG_POSTS_DIR = prevBlogPostsDir
    clearPostsRuntimeCache()
  })

  it("writes cover to all i18n siblings sharing a translationKey", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "shared",
    }, "body body body body body body body")
    seedPost(postsDir, "q", "en", {
      title: "One", description: "long enough description", date: "2026-01-01",
      locale: "en", slug: "q", tags: [], author: "A", published: true, translationKey: "shared",
    }, "body body body body body body body")
    seedPost(postsDir, "r", "it", {
      title: "Uno", description: "descrizione abbastanza lunga", date: "2026-01-01",
      locale: "it", slug: "r", tags: [], author: "A", published: true, translationKey: "shared",
    }, "body body body body body body body")
    clearPostsRuntimeCache()

    const result = await syncCoverToFrontmatter("shared", "hero")

    expect(result.synced.sort()).toEqual(["posts/p.es.mdx", "posts/q.en.mdx", "posts/r.it.mdx"])
    expect(result.failed).toEqual([])
    expect(readCover(postsDir, "p.es.mdx")).toBe("hero")
    expect(readCover(postsDir, "q.en.mdx")).toBe("hero")
    expect(readCover(postsDir, "r.it.mdx")).toBe("hero")
  })

  it("removes cover from siblings when called with null", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "k",
      cover: "old",
    }, "body body body body body body body")
    seedPost(postsDir, "q", "en", {
      title: "One", description: "long enough description", date: "2026-01-01",
      locale: "en", slug: "q", tags: [], author: "A", published: true, translationKey: "k",
      cover: "old",
    }, "body body body body body body body")
    clearPostsRuntimeCache()

    await syncCoverToFrontmatter("k", null)

    expect(readCover(postsDir, "p.es.mdx")).toBeUndefined()
    expect(readCover(postsDir, "q.en.mdx")).toBeUndefined()
  })

  it("returns synced=[] when no posts share the key (does not throw)", async () => {
    const r = await syncCoverToFrontmatter("ghost", "hero")
    expect(r.synced).toEqual([])
    expect(r.failed).toEqual([])
  })

  it("skips files where the cover already matches (no rewrite)", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "k",
      cover: "hero",
    }, "body body body body body body body")
    clearPostsRuntimeCache()

    const filePath = path.join(postsDir, "p.es.mdx")
    const mtimeBefore = fs.statSync(filePath).mtimeMs
    await new Promise((r) => setTimeout(r, 10))

    const r = await syncCoverToFrontmatter("k", "hero")

    expect(r.synced).toEqual([])
    expect(r.skipped).toEqual(["posts/p.es.mdx"])
    expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore)
  })
})

# `posts_update_frontmatter` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new MCP tool `posts_update_frontmatter` that performs partial updates of a post's frontmatter (title, description, tags, author, published, date, cover) without rewriting its body, and extend `posts_set_cover` so cover changes ripple to all i18n siblings' frontmatters. Closes the friction documented in the 2026-05-08 backlog: today flipping `published: false → true` requires `posts_delete + posts_create`, losing slug/date/translationKey/external links.

**Architecture:** Two helpers added to `lib/blog/posts-write.ts`: `updatePostFrontmatter(input)` reads the .mdx, applies partial updates via `gray-matter`, and writes it back; `syncCoverToFrontmatter(translationKey, cover)` writes `cover:` to every sibling sharing the translationKey. Both write paths in the MCP layer (`posts_update_frontmatter` and the existing `posts_set_cover`) call `syncCoverToFrontmatter`, so `_meta.json.cover` and frontmatter `cover:` always converge.

**Tech Stack:** Node.js, TypeScript, `gray-matter` for frontmatter parsing, Jest for tests. Files: `lib/blog/posts-write.ts`, `lib/mcp/rpc-handler.ts`, `__tests__/lib/posts-write-update-frontmatter.test.ts`, `__tests__/lib/posts-write-sync-cover.test.ts`, `__tests__/lib/mcp-rpc-handler.test.ts`, `docs/agent-prompts/blog-claude-project.md`.

**Spec:** `docs/superpowers/specs/2026-05-08-posts-update-frontmatter-design.md` (commit `41b3cb5`).

---

## File Structure

| File | Role | Operation |
|---|---|---|
| `lib/blog/posts-write.ts` | Add `UpdatePostFrontmatterInput`, `updatePostFrontmatter`, `syncCoverToFrontmatter`. | Modify |
| `lib/mcp/rpc-handler.ts` | Register `posts_update_frontmatter` in `toolsList()`. Dispatch in `handleRpcCall`. Extend `posts_set_cover` dispatch. Add "GESTIÓN DE FRONTMATTER" to `initialize.instructions`. | Modify |
| `__tests__/lib/posts-write-update-frontmatter.test.ts` | Unit tests for the helper. | Create |
| `__tests__/lib/posts-write-sync-cover.test.ts` | Unit tests for the sibling sync helper. | Create |
| `__tests__/lib/mcp-rpc-handler.test.ts` | Add tests for the new tool plus the extension. | Modify |
| `docs/agent-prompts/blog-claude-project.md` | Update the playbook to point at the new tool. | Modify |

`lib/blog/media-cover.ts` is **not** modified. It stays focused on `_meta.json.cover`.

---

## Task 1: `updatePostFrontmatter` helper (no cover-sync yet)

**Files:**
- Create: `__tests__/lib/posts-write-update-frontmatter.test.ts`
- Modify: `lib/blog/posts-write.ts` (append new exports)

- [ ] **Step 1: Write the failing test file**

```typescript
// __tests__/lib/posts-write-update-frontmatter.test.ts
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import matter from "gray-matter"
import {
  updatePostFrontmatter,
  PostsWriteError,
  isPostsWriteError,
} from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

function seedPost(dir: string, slug: string, locale: "es" | "en" | "it", frontmatter: Record<string, unknown>, body: string) {
  const fmYaml = matter.stringify(body, frontmatter)
  fs.writeFileSync(path.join(dir, `${slug}.${locale}.mdx`), fmYaml, "utf-8")
}

describe("updatePostFrontmatter", () => {
  let postsDir: string
  let mediaRoot: string

  beforeEach(() => {
    postsDir = fs.mkdtempSync(path.join(os.tmpdir(), "upf-posts-"))
    mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "upf-media-"))
    process.env.BLOG_POSTS_DIR = postsDir
    process.env.MEDIA_UPLOADS_ROOT = mediaRoot
    clearPostsRuntimeCache()
  })

  afterEach(() => {
    fs.rmSync(postsDir, { recursive: true, force: true })
    fs.rmSync(mediaRoot, { recursive: true, force: true })
    delete process.env.BLOG_POSTS_DIR
    delete process.env.MEDIA_UPLOADS_ROOT
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
```

- [ ] **Step 2: Run the test to verify failures**

Run: `npx jest __tests__/lib/posts-write-update-frontmatter.test.ts`
Expected: every test fails with "updatePostFrontmatter is not a function".

- [ ] **Step 3: Implement `updatePostFrontmatter` in `lib/blog/posts-write.ts`**

Append after the existing `updatePostBody` function (around line 366):

```typescript
export interface UpdatePostFrontmatterInput {
  slug: string
  locale: Locale
  title?: string
  description?: string
  tags?: string[]
  author?: string
  published?: boolean
  date?: string
  cover?: string | null
}

export interface UpdatePostFrontmatterResult {
  ok: true
  slug: string
  locale: Locale
  updated: string[]
  coverSyncedToMeta: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const d = new Date(value + "T00:00:00Z")
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === value
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export async function updatePostFrontmatter(
  input: UpdatePostFrontmatterInput
): Promise<UpdatePostFrontmatterResult> {
  const slug = (input.slug || "").trim()
  const locale = input.locale

  if (!slug) {
    throw new PostsWriteError("invalid_params", 400, "slug is required", { field: "slug" })
  }
  if (!isValidLocale(locale)) {
    throw new PostsWriteError(
      "unsupported_locale",
      400,
      "locale is required and must be one of es,en,it",
      { supported: SUPPORTED_LOCALES }
    )
  }

  if (input.title !== undefined && input.title.trim().length < 3) {
    throw new PostsWriteError("invalid_params", 400, "title must be at least 3 characters", { field: "title" })
  }
  if (input.description !== undefined && input.description.trim().length < 10) {
    throw new PostsWriteError("invalid_params", 400, "description must be at least 10 characters", { field: "description" })
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string" || t.trim().length === 0)) {
      throw new PostsWriteError("invalid_params", 400, "tags must be an array of non-empty strings", { field: "tags" })
    }
  }
  if (input.author !== undefined && input.author.trim().length < 1) {
    throw new PostsWriteError("invalid_params", 400, "author must be non-empty", { field: "author" })
  }
  if (input.published !== undefined && typeof input.published !== "boolean") {
    throw new PostsWriteError("invalid_params", 400, "published must be a boolean", { field: "published" })
  }
  if (input.date !== undefined && !isValidDateString(input.date)) {
    throw new PostsWriteError("invalid_params", 400, "date must be a valid YYYY-MM-DD string", { field: "date" })
  }
  if (input.cover !== undefined && input.cover !== null) {
    if (typeof input.cover !== "string" || input.cover.trim().length === 0) {
      throw new PostsWriteError("invalid_params", 400, "cover must be a non-empty string or null", { field: "cover" })
    }
  }

  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  if (!post) {
    throw new PostsWriteError("not_found", 404, `Post ${slug}/${locale} not found`, { slug, locale })
  }

  // Pre-write cover-kind check: refuse kind_mismatch BEFORE touching disk so the
  // post stays untouched on rejection.
  if (typeof input.cover === "string") {
    const { readMeta } = await import("./media-meta")
    const meta = await readMeta(post.translationKey)
    const entry = meta.files[input.cover]
    if (entry && entry.kind !== "image") {
      throw new PostsWriteError("kind_mismatch", 400, `media "${input.cover}" is a ${entry.kind}, only images can be covers`, { field: "cover", kind: entry.kind })
    }
  }

  const filePath = path.join(getContentRoot(), "content", post._raw.sourceFilePath)
  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf-8")
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to read file", { details })
  }
  const parsed = matter(raw)
  const data: Record<string, unknown> = { ...parsed.data }
  const updated: string[] = []

  if (input.title !== undefined && input.title !== data.title) { data.title = input.title; updated.push("title") }
  if (input.description !== undefined && input.description !== data.description) { data.description = input.description; updated.push("description") }
  if (input.author !== undefined && input.author !== data.author) { data.author = input.author; updated.push("author") }
  if (input.published !== undefined && input.published !== data.published) { data.published = input.published; updated.push("published") }
  if (input.date !== undefined && input.date !== data.date) { data.date = input.date; updated.push("date") }
  if (input.tags !== undefined) {
    const cur = Array.isArray(data.tags) ? (data.tags as unknown[]) : []
    if (!arraysEqual(cur, input.tags)) { data.tags = input.tags; updated.push("tags") }
  }
  if (input.cover !== undefined) {
    if (input.cover === null) {
      if (data.cover !== undefined) { delete data.cover; updated.push("cover") }
    } else if (input.cover !== data.cover) {
      data.cover = input.cover
      updated.push("cover")
    }
  }

  if (updated.length === 0) {
    return { ok: true, slug, locale, updated: [], coverSyncedToMeta: false }
  }

  const next = matter.stringify(parsed.content, data)
  try {
    await fs.writeFile(filePath, next, { encoding: "utf-8" })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new PostsWriteError("internal_error", 500, "Failed to write file", { details })
  }
  clearPostsRuntimeCache()

  // Cover sync to _meta.json + i18n siblings is wired in Task 2 + Task 3.
  return { ok: true, slug, locale, updated, coverSyncedToMeta: false }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/lib/posts-write-update-frontmatter.test.ts`
Expected: all tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/posts-write.ts __tests__/lib/posts-write-update-frontmatter.test.ts
git commit -m "feat(blog): updatePostFrontmatter helper for partial frontmatter edits"
```

---

## Task 2: `syncCoverToFrontmatter` helper

**Files:**
- Create: `__tests__/lib/posts-write-sync-cover.test.ts`
- Modify: `lib/blog/posts-write.ts` (add another export)

- [ ] **Step 1: Write the failing test file**

```typescript
// __tests__/lib/posts-write-sync-cover.test.ts
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import matter from "gray-matter"
import { syncCoverToFrontmatter } from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

function seedPost(dir: string, slug: string, locale: "es" | "en" | "it", frontmatter: Record<string, unknown>, body: string) {
  const out = matter.stringify(body, frontmatter)
  fs.writeFileSync(path.join(dir, `${slug}.${locale}.mdx`), out, "utf-8")
}

function readCover(dir: string, file: string): string | undefined {
  const raw = fs.readFileSync(path.join(dir, file), "utf-8")
  const parsed = matter(raw)
  return parsed.data.cover as string | undefined
}

describe("syncCoverToFrontmatter", () => {
  let postsDir: string
  beforeEach(() => {
    postsDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-cover-"))
    process.env.BLOG_POSTS_DIR = postsDir
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(postsDir, { recursive: true, force: true })
    delete process.env.BLOG_POSTS_DIR
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

    expect(result.synced).toEqual(expect.arrayContaining(["p.es.mdx", "q.en.mdx", "r.it.mdx"]))
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
    expect(r.skipped).toEqual(["p.es.mdx"])
    expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore)
  })
})
```

- [ ] **Step 2: Run the test to verify failures**

Run: `npx jest __tests__/lib/posts-write-sync-cover.test.ts`
Expected: every test fails with "syncCoverToFrontmatter is not a function".

- [ ] **Step 3: Implement `syncCoverToFrontmatter` in `lib/blog/posts-write.ts`**

Append after `updatePostFrontmatter`:

```typescript
export interface SyncCoverResult {
  synced: string[]   // sourceFilePath of each updated file
  skipped: string[]  // already matched, no write
  failed: { file: string; error: string }[]
}

export async function syncCoverToFrontmatter(
  translationKey: string,
  cover: string | null
): Promise<SyncCoverResult> {
  const { findPostsByTranslationKey } = await import("./translation-key")
  const siblings = await findPostsByTranslationKey(translationKey)

  const synced: string[] = []
  const skipped: string[] = []
  const failed: { file: string; error: string }[] = []

  for (const sib of siblings) {
    const filePath = path.join(getContentRoot(), "content", sib._raw.sourceFilePath)
    let raw: string
    try {
      raw = await fs.readFile(filePath, "utf-8")
    } catch (err) {
      failed.push({ file: sib._raw.sourceFilePath, error: err instanceof Error ? err.message : String(err) })
      continue
    }
    const parsed = matter(raw)
    const data: Record<string, unknown> = { ...parsed.data }
    const current = data.cover

    if (cover === null) {
      if (current === undefined) { skipped.push(sib._raw.sourceFilePath); continue }
      delete data.cover
    } else {
      if (current === cover) { skipped.push(sib._raw.sourceFilePath); continue }
      data.cover = cover
    }

    const next = matter.stringify(parsed.content, data)
    try {
      await fs.writeFile(filePath, next, "utf-8")
      synced.push(sib._raw.sourceFilePath)
    } catch (err) {
      failed.push({ file: sib._raw.sourceFilePath, error: err instanceof Error ? err.message : String(err) })
    }
  }

  if (synced.length > 0) clearPostsRuntimeCache()
  return { synced, skipped, failed }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/lib/posts-write-sync-cover.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Wire `syncCoverToFrontmatter` into `updatePostFrontmatter`**

Replace the comment near the end of `updatePostFrontmatter` (`// Cover sync to _meta.json + i18n siblings is wired in Task 2 + Task 3.`) and the final `return` statement with this block:

```typescript
  // Cover sync to _meta.json. The kind_mismatch case was already filtered out
  // above the write, so SetCoverError("kind_mismatch") cannot happen here.
  // SetCoverError("not_found") just means the slug-key isn't in meta yet —
  // tolerate it; frontmatter alone is fine for pre-upload placeholders.
  let coverSyncedToMeta = false
  if (input.cover !== undefined) {
    const { setCover, SetCoverError } = await import("./media-cover")
    try {
      await setCover(post.translationKey, input.cover)
      coverSyncedToMeta = true
    } catch (err) {
      if (!(err instanceof SetCoverError) || err.code !== "not_found") throw err
    }
    // Ripple to siblings.
    await syncCoverToFrontmatter(post.translationKey, input.cover)
  }

  return { ok: true, slug, locale, updated, coverSyncedToMeta }
```

- [ ] **Step 6: Add cover-related tests to the update-frontmatter test file**

Append to `__tests__/lib/posts-write-update-frontmatter.test.ts` inside the existing `describe`:

```typescript
  it("sets cover in frontmatter and meta when meta has the slug-key as image", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")
    const { writeMeta, readMeta } = await import("@/lib/blog/media-meta")
    await writeMeta("p", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    clearPostsRuntimeCache()

    const r = await updatePostFrontmatter({ slug: "p", locale: "es", cover: "hero" })

    expect(r.updated).toEqual(["cover"])
    expect(r.coverSyncedToMeta).toBe(true)
    const parsed = readPost("p", "es")
    expect(parsed.data.cover).toBe("hero")
    expect((await readMeta("p")).cover).toBe("hero")
  })

  it("sets cover in frontmatter only when meta has no entry yet", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")
    clearPostsRuntimeCache()

    const r = await updatePostFrontmatter({ slug: "p", locale: "es", cover: "future-hero" })

    expect(r.updated).toEqual(["cover"])
    expect(r.coverSyncedToMeta).toBe(false)
    expect(readPost("p", "es").data.cover).toBe("future-hero")
  })

  it("rejects cover when meta entry exists but is a video", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
    }, "body body body body body body body")
    const { writeMeta } = await import("@/lib/blog/media-meta")
    await writeMeta("p", { reel: { ext: "mp4", kind: "video", alt: "", caption: "" } })
    clearPostsRuntimeCache()

    await expect(
      updatePostFrontmatter({ slug: "p", locale: "es", cover: "reel" })
    ).rejects.toMatchObject({ code: "kind_mismatch", details: { field: "cover" } })

    expect(readPost("p", "es").data.cover).toBeUndefined()
  })

  it("clears cover from frontmatter and meta when given null", async () => {
    seedPost(postsDir, "p", "es", {
      title: "Una", description: "descripción suficientemente larga", date: "2026-01-01",
      locale: "es", slug: "p", tags: [], author: "A", published: true, translationKey: "p",
      cover: "old",
    }, "body body body body body body body")
    const { writeMeta, readMeta } = await import("@/lib/blog/media-meta")
    await writeMeta("p", { old: { ext: "jpg", kind: "image", alt: "", caption: "" } }, { cover: "old" })
    clearPostsRuntimeCache()

    const r = await updatePostFrontmatter({ slug: "p", locale: "es", cover: null })

    expect(r.updated).toEqual(["cover"])
    expect(r.coverSyncedToMeta).toBe(true)
    expect(readPost("p", "es").data.cover).toBeUndefined()
    expect((await readMeta("p")).cover).toBeUndefined()
  })
```

- [ ] **Step 7: Run both test files and verify they pass**

Run: `npx jest __tests__/lib/posts-write-update-frontmatter.test.ts __tests__/lib/posts-write-sync-cover.test.ts`
Expected: every test passes.

- [ ] **Step 8: Commit**

```bash
git add lib/blog/posts-write.ts __tests__/lib/posts-write-sync-cover.test.ts __tests__/lib/posts-write-update-frontmatter.test.ts
git commit -m "feat(blog): syncCoverToFrontmatter + cover handling in updatePostFrontmatter"
```

---

## Task 3: Wire `posts_update_frontmatter` MCP tool

**Files:**
- Modify: `lib/mcp/rpc-handler.ts`
- Modify: `__tests__/lib/mcp-rpc-handler.test.ts`

- [ ] **Step 1: Add the tool to `toolsList()`**

In `lib/mcp/rpc-handler.ts`, locate the array returned by `toolsList()` (starts around line 112). Insert this entry **after** the `posts_set_cover` entry (around line 341, before the closing `]`):

```typescript
      {
        name: "posts_update_frontmatter",
        description:
          "Edita campos del frontmatter de un post sin tocar el body. " +
          "Acepta `title`, `description`, `tags`, `author`, `published`, `date`, `cover` " +
          "como partial update — solo los campos presentes se modifican. NO permite " +
          "cambiar `slug`, `locale` ni `translationKey` (eso requeriría renombrar el " +
          "fichero o desincronizar siblings i18n). Para cambiar el cover, ambos sitios " +
          "(frontmatter y `_meta.json.cover`) se sincronizan automáticamente y los " +
          "siblings i18n del translationKey reciben el mismo `cover:` en su frontmatter. " +
          "Pasa `cover: null` para limpiar. Idempotente. Requiere scope posts:write.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
            title: { type: "string", minLength: 3 },
            description: { type: "string", minLength: 10 },
            tags: { type: "array", items: { type: "string", minLength: 1 } },
            author: { type: "string", minLength: 1 },
            published: { type: "boolean" },
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            cover: { type: ["string", "null"] },
          },
          required: ["slug", "locale"],
        },
        annotations: {
          title: "Editar frontmatter del post",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
```

- [ ] **Step 2: Add the dispatch branch in `handleRpcCall`**

In the same file, after the closing `}` of the `posts_set_cover` branch (around line 705) and before `if (toolName === "posts_rebuild")`:

```typescript
    if (toolName === "posts_update_frontmatter") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params")
      }
      const { updatePostFrontmatter } = await import("@/lib/blog/posts-write")
      try {
        const result = await updatePostFrontmatter({
          slug,
          locale,
          ...(args.title !== undefined ? { title: args.title as string } : {}),
          ...(args.description !== undefined ? { description: args.description as string } : {}),
          ...(args.tags !== undefined ? { tags: args.tags as string[] } : {}),
          ...(args.author !== undefined ? { author: args.author as string } : {}),
          ...(args.published !== undefined ? { published: args.published as boolean } : {}),
          ...(args.date !== undefined ? { date: args.date as string } : {}),
          ...(args.cover !== undefined ? { cover: args.cover as string | null } : {}),
        })
        return successResponse(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        })
      } catch (err) {
        if (isPostsWriteError(err)) {
          const code = err.code === "not_found" ? -32004 : err.code === "invalid_params" || err.code === "unsupported_locale" ? -32602 : err.code === "kind_mismatch" ? -32001 : -32000
          return errorResponse(id, code, err.code, err.details)
        }
        return errorResponse(id, -32603, "Internal error", { message: String(err) })
      }
    }
```

- [ ] **Step 3: Find the existing `tools/list` test and update the expected list**

Open `__tests__/lib/mcp-rpc-handler.test.ts`, find the assertion that checks the alphabetised tool name list (it should already include `posts_set_cover`). Add `posts_update_frontmatter` in the right alphabetical position.

```bash
grep -n "posts_set_cover\|posts_update_body" __tests__/lib/mcp-rpc-handler.test.ts
```

Edit the array literal to be:

```typescript
expect(names).toEqual([
  "posts_create",
  "posts_delete",
  "posts_get",
  "posts_list_media",
  "posts_rebuild",
  "posts_request_upload",
  "posts_search",
  "posts_set_cover",
  "posts_update_body",
  "posts_update_frontmatter",
  "posts_validate",
])
```

(If the existing list ordering or contents differs, keep the existing entries and add `posts_update_frontmatter` after `posts_update_body`. Match the file's exact style.)

- [ ] **Step 4: Add a dispatch happy-path test**

Append to `__tests__/lib/mcp-rpc-handler.test.ts` inside the existing tools/call describe block:

```typescript
  it("posts_update_frontmatter flips published with valid scope", async () => {
    // Seed a post in the tmp dir used by this test file. Reuse whatever helper
    // the surrounding tests use for posts_set_cover; if there's no helper,
    // call writeFile + clearPostsRuntimeCache here.
    const setup = await seedPostForTest({
      slug: "draft-x",
      locale: "es",
      frontmatter: {
        title: "Borrador",
        description: "Descripción suficientemente larga",
        date: "2026-01-01",
        locale: "es",
        slug: "draft-x",
        tags: [],
        author: "A",
        published: false,
        translationKey: "draft-x",
      },
      body: "body body body body body body body",
    })

    const result = await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_update_frontmatter", arguments: { slug: "draft-x", locale: "es", published: true } },
      },
      { claims: { scope: ["posts:write"] } as any }
    )

    expect("result" in result).toBe(true)
    const text = (result as any).result.content[0].text
    const parsed = JSON.parse(text)
    expect(parsed.ok).toBe(true)
    expect(parsed.updated).toEqual(["published"])
    setup.cleanup()
  })

  it("posts_update_frontmatter rejects without posts:write scope", async () => {
    const result = await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_update_frontmatter", arguments: { slug: "x", locale: "es", published: true } },
      },
      { claims: { scope: ["posts:read"] } as any }
    )
    expect("error" in result).toBe(true)
    expect((result as any).error.message).toMatch(/scope/i)
  })
```

If `seedPostForTest` does not exist in this test file, look for the equivalent helper used by the existing `posts_set_cover` test and copy the pattern. If none exists, write the seeding inline using `fs.mkdtempSync` + `process.env.BLOG_POSTS_DIR` (mirror Task 1 step 1). The cleanup step must restore env and remove the tmp dir.

- [ ] **Step 5: Run the rpc-handler tests**

Run: `npx jest __tests__/lib/mcp-rpc-handler.test.ts`
Expected: all tests pass, including the two new ones and the updated tools/list expectation.

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/rpc-handler.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "feat(mcp): posts_update_frontmatter tool — partial frontmatter edits"
```

---

## Task 4: Extend `posts_set_cover` to ripple frontmatter

**Files:**
- Modify: `lib/mcp/rpc-handler.ts` (the `posts_set_cover` dispatch around line 670)
- Modify: `__tests__/lib/mcp-rpc-handler.test.ts`

- [ ] **Step 1: Find the existing `posts_set_cover` happy-path test**

```bash
grep -n "posts_set_cover" __tests__/lib/mcp-rpc-handler.test.ts
```

Read the test and confirm it asserts only on `_meta.json.cover`. We will extend it to also assert on the frontmatter `cover:` of the post and at least one i18n sibling.

- [ ] **Step 2: Modify the existing test to expect frontmatter ripple**

In the existing `posts_set_cover` test, after the `_meta.json` assertion, add:

```typescript
    // Frontmatter ripple: the post itself and any i18n sibling now carry cover: <name>
    const matter = (await import("gray-matter")).default
    const sourceEs = fs.readFileSync(path.join(postsDir, `${slug}.es.mdx`), "utf-8")
    expect(matter(sourceEs).data.cover).toBe("hero")
    // If there's a sibling .en/.it, assert on those too. (Skip if the test only seeds one locale.)
```

If the existing test only seeds a single locale, leave that branch as a comment. The new ripple test in step 3 covers the multi-locale case.

- [ ] **Step 3: Add a new test that seeds three locales**

Append to the same describe block:

```typescript
  it("posts_set_cover ripples cover to all i18n siblings' frontmatter", async () => {
    const setup = await seedThreeLocaleSiblings({
      translationKey: "shared-rip",
      slugs: { es: "p", en: "q", it: "r" },
    })
    // Add an image entry to meta so setCover validates:
    const { writeMeta } = await import("@/lib/blog/media-meta")
    await writeMeta("shared-rip", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })

    const result = await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_set_cover", arguments: { slug: "p", locale: "es", cover: "hero" } },
      },
      { claims: { scope: ["posts:write"] } as any }
    )
    expect("result" in result).toBe(true)

    const matter = (await import("gray-matter")).default
    const fs = await import("fs")
    expect(matter(fs.readFileSync(path.join(setup.postsDir, "p.es.mdx"), "utf-8")).data.cover).toBe("hero")
    expect(matter(fs.readFileSync(path.join(setup.postsDir, "q.en.mdx"), "utf-8")).data.cover).toBe("hero")
    expect(matter(fs.readFileSync(path.join(setup.postsDir, "r.it.mdx"), "utf-8")).data.cover).toBe("hero")

    setup.cleanup()
  })
```

If `seedThreeLocaleSiblings` does not exist, write it next to the file's other helpers using `fs.mkdtempSync(...)`, `process.env.BLOG_POSTS_DIR = postsDir`, and `matter.stringify` for each of the three locales.

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx jest __tests__/lib/mcp-rpc-handler.test.ts -t "posts_set_cover"`
Expected: the new ripple test fails because the dispatch only writes `_meta.json` today.

- [ ] **Step 5: Modify the `posts_set_cover` dispatch to call `syncCoverToFrontmatter`**

In `lib/mcp/rpc-handler.ts`, around line 686, replace:

```typescript
      try {
        await setCover(key, coverArg as string | null)
        return successResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: true,
                translationKey: key,
                cover: coverArg,
              }),
            },
          ],
        })
      } catch (err) {
```

with:

```typescript
      try {
        await setCover(key, coverArg as string | null)
        const { syncCoverToFrontmatter } = await import("@/lib/blog/posts-write")
        const ripple = await syncCoverToFrontmatter(key, coverArg as string | null)
        return successResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: true,
                translationKey: key,
                cover: coverArg,
                frontmatterSynced: ripple.synced,
                frontmatterFailed: ripple.failed,
              }),
            },
          ],
        })
      } catch (err) {
```

- [ ] **Step 6: Run the rpc-handler tests again**

Run: `npx jest __tests__/lib/mcp-rpc-handler.test.ts`
Expected: every test passes including the ripple test.

- [ ] **Step 7: Commit**

```bash
git add lib/mcp/rpc-handler.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "feat(mcp): posts_set_cover ripples cover to i18n siblings' frontmatter"
```

---

## Task 5: Update `initialize.instructions` with frontmatter guidance

**Files:**
- Modify: `lib/mcp/rpc-handler.ts` (the `initialize` branch around line 357)

- [ ] **Step 1: Locate the instructions string**

Run:
```bash
grep -n "GESTIÓN DE PORTADA" lib/mcp/rpc-handler.ts
```

The block starts around line 375. Insert the new section **right after** the existing "GESTIÓN DE PORTADA" paragraph and **before** "COMPONENTES MDX".

- [ ] **Step 2: Add the GESTIÓN DE FRONTMATTER section**

Insert this block as a new concatenated string segment in the `instructions:` value. Follow the same `"...string...\n\n" +` style:

```typescript
        "GESTIÓN DE FRONTMATTER — para cualquier edit del frontmatter de un post " +
        "(publicar un borrador, arreglar typo en title/description, retag, cambiar fecha, " +
        "fijar cover) usa `posts_update_frontmatter` con un partial: solo los campos que " +
        "envíes se modifican. NUNCA uses delete+create para cambiar metadatos — perderías " +
        "slug, translationKey y links externos. Reglas: `published: true` SIEMPRE bajo " +
        "confirmación explícita del usuario; cover via este tool sincroniza también " +
        "`_meta.json.cover` y todos los siblings i18n; null limpia. Lo que este tool NO " +
        "hace: no renombra slug, no cambia locale, no edita el body (eso es " +
        "`posts_update_body`).\n\n" +
```

- [ ] **Step 3: Run the rpc-handler tests once more to confirm nothing broke**

Run: `npx jest __tests__/lib/mcp-rpc-handler.test.ts`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add lib/mcp/rpc-handler.ts
git commit -m "docs(mcp): document posts_update_frontmatter in initialize.instructions"
```

---

## Task 6: Update the agent prompt at `docs/agent-prompts/blog-claude-project.md`

**Files:**
- Modify: `docs/agent-prompts/blog-claude-project.md`

- [ ] **Step 1: Find the workflow and tool sections**

```bash
grep -n "posts_set_cover\|posts_delete\|posts_create\|published" docs/agent-prompts/blog-claude-project.md | head -20
```

- [ ] **Step 2: Add `posts_update_frontmatter` to the tools list**

Insert a bullet next to the existing `posts_set_cover` entry, mirroring its style:

```markdown
- `posts_update_frontmatter({ slug, locale, ...campos })` — edita frontmatter de un post (`title`, `description`, `tags`, `author`, `published`, `date`, `cover`). Partial update: solo los campos enviados se modifican. Cambiar `cover` aquí sincroniza también `_meta.json.cover` y los siblings i18n. NO permite cambiar slug/locale/translationKey (operaciones distintas, no implementadas). Úsalo para flipear `published`, corregir typos o cualquier metadato — NUNCA delete+create.
```

- [ ] **Step 3: Update the workflow rules**

Find the "publish a draft" / `published` workflow paragraph (or add one if absent) and replace any "delete + create" guidance with:

```markdown
**Publicar un borrador:** llama a `posts_update_frontmatter({ slug, locale, published: true })`. Pide confirmación al usuario antes — `published: true` es un acto editorial. Nunca borres y recrees un post para cambiar `published`: pierdes slug/translationKey/fecha/links externos.

**Cambiar metadatos (title/description/tags/date/author):** mismo tool, partial update.

**Cambiar la portada:** dos opciones equivalentes — `posts_set_cover({ slug, locale, cover })` (atajo) o `posts_update_frontmatter({ slug, locale, cover })`. Ambas sincronizan frontmatter + `_meta.json.cover` + siblings i18n.
```

- [ ] **Step 4: Add to the "hard rules" section**

Append (or extend the existing list):

```markdown
- NUNCA uses `posts_delete` + `posts_create` para cambiar metadatos. El tool correcto es `posts_update_frontmatter`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/agent-prompts/blog-claude-project.md
git commit -m "docs(agent): point Claude.ai playbook at posts_update_frontmatter"
```

---

## Task 7: Run the full test suite

**Files:** none.

- [ ] **Step 1: Run the entire Jest suite**

Run: `npx jest`
Expected: pass. If anything regresses, the most likely culprits are tests that hardcoded the tool count (search for `tools.length`) or tests that mocked `lib/blog/posts-write.ts` (search for `jest.mock.*posts-write`). Fix them in the same commit.

- [ ] **Step 2: Update `tasks/todo.md`**

Find the "TASK — Tool MCP para flipear `published`..." section and mark it as resolved. Replace the body with a one-line entry:

```markdown
## Resolved 2026-05-08 — `posts_update_frontmatter` shipped (commits in feature/chatgpt-custom-connector)

Replaces the speculative `posts_set_published` design with a more general partial-frontmatter editor. See `docs/superpowers/specs/2026-05-08-posts-update-frontmatter-design.md` and `docs/superpowers/plans/2026-05-08-posts-update-frontmatter.md`.
```

- [ ] **Step 3: Commit**

```bash
git add tasks/todo.md
git commit -m "docs(tasks): mark posts_update_frontmatter task resolved"
```

---

## Verification (post-deploy, operator)

These steps require `npm run build && pm2 restart e2d`. Out of scope of the autonomous implementation pass. Documented for the next operator window.

1. **`tools/list` exposes `posts_update_frontmatter`:**
   ```bash
   curl -s -H "Authorization: Bearer <admin-token>" -X POST https://evolve2digital.com/mcp \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name' | grep frontmatter
   ```
   Expected: `"posts_update_frontmatter"`.

2. **Flip a real draft:** in Claude.ai, find a post with `published: false`, call the tool with `published: true`, reload `https://evolve2digital.com/<locale>/blog/<slug>`. Should render.

3. **Cover ripple:** call `posts_set_cover({ slug, locale, cover })`. Inspect `/var/lib/e2d-content/posts/<slug>.<locale>.mdx` for every locale — frontmatter `cover` should be the new value in all of them. `_meta.json.cover` should also reflect it.

4. **Idempotent no-op:** call the tool with the existing values; result should be `{ ok: true, updated: [] }` and the file mtime should not change.

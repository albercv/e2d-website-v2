# Media Uploads with Markers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the LLM compose blog posts with inline images/videos and a cover, by separating binary upload (form on the admin) from placement (markers in the MDX body resolved at render time).

**Architecture:** A simple admin-only `/admin/media-upload` form drops binaries to `public/uploads/<translationKey>/` and writes a sidecar `_meta.json` with alt/caption per file. The LLM writes posts using string markers (`[image:name]`, `[video:name]`) and a `cover: name` frontmatter field. A pre-processor in `getCompiledPost()` substitutes the markers using `_meta.json` before serializing the MDX, emitting `<figure>` elements or a visible `<MediaMissing>` placeholder for unresolved markers. Four new MCP tools (`posts_request_upload`, `posts_update_body`, `posts_list_media`, `posts_validate`) plus modifications to `posts_create` and `posts_delete` complete the LLM-facing surface. The marker convention is documented in the MCP `initialize.instructions` field and in the `description` field of each tool so the LLM picks it up automatically on connect.

**Tech Stack:** Next.js 14 App Router, TypeScript, `next-mdx-remote/serialize`, `gray-matter`, `jsonwebtoken`, `better-sqlite3` (existing OAuth), Jest. No new heavy dependencies — markers are processed with vanilla string parsing.

**Spec:** `docs/superpowers/specs/2026-05-05-media-uploads-with-markers-design.md`

---

## File Structure

### New files

| File | Purpose |
|---|---|
| `lib/blog/media-naming.ts` | Pure helper `slugifyMediaName(input: string): string`. Used by both client form and server validation. |
| `lib/blog/media-meta.ts` | Read/write/lock `_meta.json` per `translationKey`. `readMeta(key)`, `writeMeta(key, files)`, with `O_EXCL` lock. In-memory cache keyed by `translationKey` with `mtimeMs` invalidation. |
| `lib/blog/media-storage.ts` | Streaming write of binaries to `public/uploads/<key>/<name>.<ext>`. MIME whitelist + ext mapping. Pure I/O layer, no metadata. |
| `lib/blog/media-markers.ts` | The marker pre-processor: tokenizes MDX outside fenced/inline code, substitutes `[image:X]`/`[video:X]` with `<figure>` or `<MediaMissing>`. Resolves frontmatter `cover` to a URL or `null`. |
| `lib/blog/translation-key.ts` | `findPostsByTranslationKey(key)` and `getTranslationKeyForSlug(slug, locale)` — group siblings. |
| `app/admin/media-upload/page.tsx` | Client form: drop zone, per-file rows (Name/Alt/Caption), single submit batch + commit. |
| `app/admin/media-upload/MediaUploadForm.tsx` | The form's interactive component (kept separate so the page is the bare entry). |
| `app/api/admin/media/upload/route.ts` | `POST` per-file streaming endpoint. |
| `app/api/admin/media/upload/commit/route.ts` | `POST` end-of-batch commit that merges `_meta.json` atomically. |
| `app/api/admin/media/token-info/route.ts` | `GET` server-side decode of the upload JWT (used by the form on mount). |
| `components/blog/MediaMissing.tsx` | Visual placeholder for unresolved markers. |
| `__tests__/lib/media-naming.test.ts` | Tests for `slugifyMediaName`. |
| `__tests__/lib/media-meta.test.ts` | Tests for read/write/lock of `_meta.json`. |
| `__tests__/lib/media-storage.test.ts` | Tests for streaming write + MIME whitelist. |
| `__tests__/lib/media-markers.test.ts` | Tests for the marker resolver (resolved/missing/kind-mismatch/inside-code). |
| `__tests__/lib/translation-key.test.ts` | Tests for `findPostsByTranslationKey`. |
| `__tests__/api/media-upload.test.ts` | API tests for upload + commit + token-info. |

### Modified files

| File | Change |
|---|---|
| `lib/blog/posts-runtime.ts` | Add `translationKey?: string` to `RuntimePost` (default = slug). Wire `media-markers` resolver into `getCompiledPost()` (substitute body before `serialize`, resolve `cover`). |
| `lib/blog/posts-write.ts` | Accept `cover?` and `translationKey?` in `createPost` (write to frontmatter). In `deletePost`, if last sibling for `translationKey` → also remove `public/uploads/<key>/`. **Remove `appendMediaToBody` if it exists** (it's not in the current codebase per the spec — verify with grep first). |
| `lib/oauth-jwt.ts` | Add `signUploadToken({translationKey}, ttlSec=900)` and `verifyUploadToken(jwt)`. Payload `{purpose:"media-upload", translationKey, exp}`. |
| `lib/mcp/rpc-handler.ts` | Add `instructions` to `initialize` response. Extend `toolsList()` with 4 new tools. Add 4 new `tools/call` branches. Modify `posts_create` branch to accept `cover` and `translationKey`. |
| `components/blog/mdx-components.tsx` | Register `MediaMissing` (so `<MediaMissing/>` produced by the resolver renders). |
| `.gitignore` | Add `public/uploads/`. |
| `next.config.mjs` | Increase API body parser limit if needed (likely already fine because we stream raw `request.body`). |

### Out-of-repo deploy steps (documented at end, not executed by the plan)

- nginx: `client_max_body_size 1100M;` and `proxy_request_buffering off;`.

---

## Conventions for every task

Every task follows TDD: write failing test → run → implement → run → commit. Commit message uses the project's style (subject ≤ 70 chars, conventional prefix, English body with `Scope:` / `Problem:` / `Solution:` / `Notes:`, **no `Co-Authored-By` trailer**).

Run tests with `npx jest <path> --no-coverage` to skip the 85% threshold during single-file runs (final task at the end runs the full suite with coverage).

The repo uses `process.env.CONTENT_ROOT` to relocate `content/` for tests; we'll add a parallel `process.env.MEDIA_UPLOADS_ROOT` to relocate `public/uploads/` (defaulting to `path.join(process.cwd(), 'public', 'uploads')`).

---

## Phase A — Foundations

### Task A1: `slugifyMediaName` helper

**Files:**
- Create: `lib/blog/media-naming.ts`
- Test: `__tests__/lib/media-naming.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/media-naming.test.ts
import { slugifyMediaName, SlugifyError } from "@/lib/blog/media-naming"

describe("slugifyMediaName", () => {
  it("lowercases", () => {
    expect(slugifyMediaName("Foo")).toBe("foo")
  })
  it("strips diacritics (NFD)", () => {
    expect(slugifyMediaName("testimonió")).toBe("testimonio")
  })
  it("maps ñ to n and ç to c", () => {
    expect(slugifyMediaName("año")).toBe("ano")
    expect(slugifyMediaName("français")).toBe("francais")
  })
  it("replaces non [a-z0-9_] with underscore", () => {
    expect(slugifyMediaName("foo-bar baz!")).toBe("foo_bar_baz")
  })
  it("collapses repeated underscores", () => {
    expect(slugifyMediaName("foo___bar")).toBe("foo_bar")
  })
  it("trims leading and trailing underscores", () => {
    expect(slugifyMediaName("__foo--bar__")).toBe("foo_bar")
  })
  it("handles full example from spec", () => {
    expect(slugifyMediaName("tesTimonió; Ferdy")).toBe("testimonio_ferdy")
    expect(slugifyMediaName("Año Nuevo!!")).toBe("ano_nuevo")
  })
  it("throws on empty result", () => {
    expect(() => slugifyMediaName("???")).toThrow(SlugifyError)
    expect(() => slugifyMediaName("")).toThrow(SlugifyError)
  })
  it("is idempotent", () => {
    const once = slugifyMediaName("Año Nuevo!!")
    expect(slugifyMediaName(once)).toBe(once)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/media-naming.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/blog/media-naming.ts
export class SlugifyError extends Error {
  constructor(input: string) {
    super(`Cannot slugify "${input}": result is empty after normalization`)
    this.name = "SlugifyError"
  }
}

export function slugifyMediaName(input: string): string {
  let s = input.toLowerCase()
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "") // strip diacritics
  s = s.replace(/ñ/g, "n").replace(/ç/g, "c")
  s = s.replace(/[^a-z0-9_]/g, "_")
  s = s.replace(/_+/g, "_")
  s = s.replace(/^_+|_+$/g, "")
  if (s.length === 0) throw new SlugifyError(input)
  return s
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/media-naming.test.ts --no-coverage
```
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/media-naming.ts __tests__/lib/media-naming.test.ts
git commit -m "$(cat <<'EOF'
feat(blog): add slugifyMediaName helper

Scope: lib/blog/media-naming.ts (new) and its unit tests. Pure helper exported for both client form and server validation.
Problem: media uploads need a stable, side-effect-free way to turn human input ("tesTimonió; Ferdy") into a filesystem-safe and URL-safe slug-key ("testimonio_ferdy"). Both the upload form and the API need the exact same rules so the validation matches.
Solution: 7-step normalization (lowercase, NFD strip diacritics, ñ→n / ç→c, non-[a-z0-9_]→_, collapse __, trim _, error on empty). Exported as a function plus a typed SlugifyError so callers can react.
Notes: idempotent — running it twice on the same input is safe. No filesystem or network access; usable from the browser bundle.
EOF
)"
```

---

### Task A2: `RuntimePost.translationKey` + `findPostsByTranslationKey`

**Files:**
- Modify: `lib/blog/posts-runtime.ts:22-37,90-119`
- Create: `lib/blog/translation-key.ts`
- Test: `__tests__/lib/translation-key.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/translation-key.test.ts --no-coverage
```
Expected: FAIL — module not found and `RuntimePost.translationKey` not yet defined.

- [ ] **Step 3a: Add `translationKey` to `RuntimePost`**

In `lib/blog/posts-runtime.ts`, edit the interface and the parser:

```ts
// Replace the existing RuntimePost interface (lines 22-37) with:
export interface RuntimePost {
  slug: string
  locale: RuntimeLocale
  title: string
  description?: string
  tags?: string[]
  author?: string
  date: string
  published: boolean
  cover?: string
  translationKey: string
  url: string
  body: { raw: string }
  wordCount: number
  readingTime: ReturnType<typeof readingTime>
  _raw: { sourceFilePath: string }
}
```

In `parseFile()` (around line 102), replace the returned object's `cover:` line with:

```ts
    cover: typeof fm.cover === "string" ? fm.cover : undefined,
    translationKey:
      typeof fm.translationKey === "string" && fm.translationKey.trim().length > 0
        ? fm.translationKey
        : slug,
```

- [ ] **Step 3b: Create `lib/blog/translation-key.ts`**

```ts
// lib/blog/translation-key.ts
import { listPostsFromDisk, type RuntimePost, type RuntimeLocale } from "./posts-runtime"

export async function findPostsByTranslationKey(key: string): Promise<RuntimePost[]> {
  const all = await listPostsFromDisk()
  return all.filter((p) => p.translationKey === key)
}

export async function getTranslationKeyForSlug(
  slug: string,
  locale: RuntimeLocale
): Promise<string | null> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  return post ? post.translationKey : null
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/translation-key.test.ts --no-coverage
```
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/posts-runtime.ts lib/blog/translation-key.ts __tests__/lib/translation-key.test.ts
git commit -m "$(cat <<'EOF'
feat(blog): expose translationKey on RuntimePost and add sibling lookups

Scope: lib/blog/posts-runtime.ts adds RuntimePost.translationKey (defaulting to slug). New module lib/blog/translation-key.ts exports findPostsByTranslationKey(key) and getTranslationKeyForSlug(slug, locale).
Problem: the upcoming media-markers feature needs to group es/en/it siblings of the same post under one storage directory. The existing RuntimePost did not carry the translationKey, so consumers had to re-parse frontmatter or guess from slugs.
Solution: parse the frontmatter field once when building RuntimePost, fall back to slug when absent. Sibling helpers reuse the existing listPostsFromDisk pipeline so they benefit from the mtime-fingerprint cache.
Notes: behavior for posts without an explicit translationKey is unchanged — they group by slug. Migration of legacy posts to share keys is out of scope here.
EOF
)"
```

---

## Phase B — Storage layer

### Task B1: Media meta storage (`_meta.json` reader/writer with lock)

**Files:**
- Create: `lib/blog/media-meta.ts`
- Test: `__tests__/lib/media-meta.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/media-meta.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import {
  readMeta,
  writeMeta,
  clearMediaMetaCache,
  type MediaMeta,
  type MediaMetaEntry,
} from "@/lib/blog/media-meta"

describe("media-meta", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mm-"))
    process.env.MEDIA_UPLOADS_ROOT = tmp
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("returns empty when no _meta.json exists", async () => {
    const meta = await readMeta("ferdy")
    expect(meta).toEqual({ version: 1, files: {} })
  })

  it("writes and reads back a meta entry", async () => {
    const entry: MediaMetaEntry = { ext: "jpg", kind: "image", alt: "A", caption: "" }
    await writeMeta("ferdy", { fachada: entry })
    const meta = await readMeta("ferdy")
    expect(meta.files.fachada).toEqual(entry)
  })

  it("merges new entries with existing ones on writeMeta", async () => {
    await writeMeta("ferdy", {
      fachada: { ext: "jpg", kind: "image", alt: "A", caption: "" },
    })
    await writeMeta("ferdy", {
      mesa: { ext: "png", kind: "image", alt: "M", caption: "" },
    })
    const meta = await readMeta("ferdy")
    expect(Object.keys(meta.files).sort()).toEqual(["fachada", "mesa"])
  })

  it("invalidates the in-memory cache when the file mtime changes", async () => {
    await writeMeta("ferdy", { a: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await readMeta("ferdy") // populates cache

    // External modification (simulates another process)
    const file = path.join(tmp, "ferdy", "_meta.json")
    const data: MediaMeta = {
      version: 1,
      files: { a: { ext: "jpg", kind: "image", alt: "", caption: "" }, b: { ext: "png", kind: "image", alt: "", caption: "" } },
    }
    // Wait briefly so mtime increments on filesystems with low resolution
    await new Promise((r) => setTimeout(r, 20))
    fs.writeFileSync(file, JSON.stringify(data))

    const meta = await readMeta("ferdy")
    expect(Object.keys(meta.files).sort()).toEqual(["a", "b"])
  })

  it("rejects concurrent writeMeta on the same key", async () => {
    const slow: Promise<void> = writeMeta("ferdy", {
      a: { ext: "jpg", kind: "image", alt: "", caption: "" },
    })
    // Trigger second write while the first is in flight
    await expect(
      writeMeta("ferdy", { b: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    ).rejects.toThrow(/locked/i)
    await slow
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/media-meta.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `media-meta.ts`**

```ts
// lib/blog/media-meta.ts
import * as fs from "fs/promises"
import * as path from "path"

export type MediaKind = "image" | "video"

export interface MediaMetaEntry {
  ext: string
  kind: MediaKind
  alt: string
  caption: string
}

export interface MediaMeta {
  version: 1
  files: Record<string, MediaMetaEntry>
}

interface CacheEntry {
  mtimeMs: number
  meta: MediaMeta
}

const cache = new Map<string, CacheEntry>()

export function clearMediaMetaCache(): void {
  cache.clear()
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

function metaPath(key: string): string {
  return path.join(getRoot(), key, "_meta.json")
}

function lockPath(key: string): string {
  return path.join(getRoot(), key, ".lock")
}

export async function readMeta(key: string): Promise<MediaMeta> {
  const file = metaPath(key)
  let stat: import("fs").Stats
  try {
    stat = (await fs.stat(file)) as unknown as import("fs").Stats
  } catch {
    return { version: 1, files: {} }
  }
  const cached = cache.get(key)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.meta
  const raw = await fs.readFile(file, "utf-8")
  const parsed = JSON.parse(raw) as MediaMeta
  cache.set(key, { mtimeMs: stat.mtimeMs, meta: parsed })
  return parsed
}

const LOCK_TTL_MS = 30_000

async function acquireLock(key: string): Promise<void> {
  const lock = lockPath(key)
  await fs.mkdir(path.dirname(lock), { recursive: true })
  try {
    await fs.writeFile(lock, String(Date.now()), { flag: "wx" })
    return
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err
    // Stale lock?
    try {
      const ts = Number(await fs.readFile(lock, "utf-8")) || 0
      if (Date.now() - ts > LOCK_TTL_MS) {
        await fs.rm(lock, { force: true })
        await fs.writeFile(lock, String(Date.now()), { flag: "wx" })
        return
      }
    } catch {
      // fall through
    }
    throw new Error(`media-meta: ${key} is locked by another writer`)
  }
}

async function releaseLock(key: string): Promise<void> {
  await fs.rm(lockPath(key), { force: true })
}

export async function writeMeta(
  key: string,
  newEntries: Record<string, MediaMetaEntry>
): Promise<MediaMeta> {
  await acquireLock(key)
  try {
    const existing = await readMeta(key)
    const merged: MediaMeta = {
      version: 1,
      files: { ...existing.files, ...newEntries },
    }
    const file = metaPath(key)
    const tmp = `${file}.tmp`
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(tmp, JSON.stringify(merged, null, 2), "utf-8")
    await fs.rename(tmp, file)
    cache.delete(key)
    return merged
  } finally {
    await releaseLock(key)
  }
}

export async function deleteMetaForKey(key: string): Promise<void> {
  await fs.rm(path.join(getRoot(), key), { recursive: true, force: true })
  cache.delete(key)
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/media-meta.test.ts --no-coverage
```
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/media-meta.ts __tests__/lib/media-meta.test.ts
git commit -m "$(cat <<'EOF'
feat(media): add _meta.json reader/writer with O_EXCL lock

Scope: lib/blog/media-meta.ts (new) — readMeta(key), writeMeta(key, entries), deleteMetaForKey(key), clearMediaMetaCache(). Per-key on-disk JSON storage with an in-memory cache invalidated by mtime.
Problem: media uploads need a single source of truth for alt/caption/kind/ext per file, shared across all the post siblings that use the same translationKey, and resilient to concurrent writers.
Solution: store one _meta.json per public/uploads/<translationKey>/, write atomically via tmp + rename, guard the merge step with an O_EXCL lockfile (.lock) carrying a timestamp so stale locks older than 30s are auto-released.
Notes: location is overridable via MEDIA_UPLOADS_ROOT for tests. The cache invalidates whenever the file's mtime changes, which covers external edits.
EOF
)"
```

---

### Task B2: Streaming binary storage with MIME whitelist

**Files:**
- Create: `lib/blog/media-storage.ts`
- Test: `__tests__/lib/media-storage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/media-storage.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { Readable } from "stream"
import {
  saveMediaFile,
  MediaStorageError,
  ALLOWED_MIME,
  extForMime,
} from "@/lib/blog/media-storage"

describe("media-storage", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    process.env.MEDIA_UPLOADS_ROOT = tmp
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("writes a stream to disk under the translationKey directory", async () => {
    const stream = Readable.from([Buffer.from("hello")])
    const result = await saveMediaFile({
      translationKey: "ferdy",
      name: "fachada",
      mime: "image/jpeg",
      stream,
    })
    expect(result).toEqual({ name: "fachada", ext: "jpg", kind: "image", size: 5 })
    const file = path.join(tmp, "ferdy", "fachada.jpg")
    expect(fs.readFileSync(file, "utf-8")).toBe("hello")
  })

  it("rejects disallowed MIME types", async () => {
    const stream = Readable.from([Buffer.from("x")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "evil",
        mime: "application/x-dosexec",
        stream,
      })
    ).rejects.toBeInstanceOf(MediaStorageError)
  })

  it("rejects when name does not match its slug form", async () => {
    const stream = Readable.from([Buffer.from("x")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "Foo Bar",
        mime: "image/png",
        stream,
      })
    ).rejects.toThrow(/normalized/i)
  })

  it("refuses to overwrite an existing file", async () => {
    fs.mkdirSync(path.join(tmp, "ferdy"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "old")
    const stream = Readable.from([Buffer.from("new")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "fachada",
        mime: "image/jpeg",
        stream,
      })
    ).rejects.toThrow(/exists/i)
    expect(fs.readFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "utf-8")).toBe("old")
  })

  it("refuses to overwrite when same name has a different extension", async () => {
    fs.mkdirSync(path.join(tmp, "ferdy"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "old")
    const stream = Readable.from([Buffer.from("new")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "fachada",
        mime: "video/mp4",
        stream,
      })
    ).rejects.toThrow(/exists/i)
  })

  it("exposes the MIME whitelist constants", () => {
    expect(ALLOWED_MIME).toContain("image/jpeg")
    expect(ALLOWED_MIME).toContain("video/mp4")
    expect(extForMime("image/jpeg")).toBe("jpg")
    expect(extForMime("video/quicktime")).toBe("mov")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/media-storage.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `media-storage.ts`**

```ts
// lib/blog/media-storage.ts
import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { pipeline } from "stream/promises"
import type { Readable } from "stream"
import { slugifyMediaName } from "./media-naming"
import type { MediaKind } from "./media-meta"

export class MediaStorageError extends Error {
  constructor(public code: "mime" | "name" | "exists" | "io", message: string) {
    super(message)
    this.name = "MediaStorageError"
  }
}

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const

export type AllowedMime = (typeof ALLOWED_MIME)[number]

const MIME_TO_EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
}

const MIME_TO_KIND: Record<AllowedMime, MediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
}

export function extForMime(mime: string): string {
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) {
    throw new MediaStorageError("mime", `mime not allowed: ${mime}`)
  }
  return MIME_TO_EXT[mime as AllowedMime]
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

export interface SaveMediaInput {
  translationKey: string
  name: string
  mime: string
  stream: Readable
}

export interface SaveMediaResult {
  name: string
  ext: string
  kind: MediaKind
  size: number
}

export async function saveMediaFile(input: SaveMediaInput): Promise<SaveMediaResult> {
  if (!(ALLOWED_MIME as readonly string[]).includes(input.mime)) {
    throw new MediaStorageError("mime", `mime not allowed: ${input.mime}`)
  }
  const slugged = slugifyMediaName(input.name)
  if (slugged !== input.name) {
    throw new MediaStorageError("name", `name "${input.name}" is not normalized (expected "${slugged}")`)
  }
  const ext = MIME_TO_EXT[input.mime as AllowedMime]
  const kind = MIME_TO_KIND[input.mime as AllowedMime]
  const dir = path.join(getRoot(), input.translationKey)
  await fsp.mkdir(dir, { recursive: true })

  // Refuse if any existing file has the same basename (any extension).
  const existing = await fsp.readdir(dir).catch(() => [] as string[])
  for (const f of existing) {
    if (f === "_meta.json" || f === ".lock") continue
    const base = f.replace(/\.[^.]+$/, "")
    if (base === input.name) {
      throw new MediaStorageError("exists", `file ${input.name} already exists in ${input.translationKey}`)
    }
  }

  const dest = path.join(dir, `${input.name}.${ext}`)
  let size = 0
  const counter = new (require("stream").Transform)({
    transform(chunk: Buffer, _enc: string, cb: (e?: Error | null) => void) {
      size += chunk.length
      this.push(chunk)
      cb()
    },
  })
  await pipeline(input.stream, counter, fs.createWriteStream(dest))
  return { name: input.name, ext, kind, size }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/media-storage.test.ts --no-coverage
```
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/media-storage.ts __tests__/lib/media-storage.test.ts
git commit -m "$(cat <<'EOF'
feat(media): add streaming binary storage with MIME whitelist

Scope: lib/blog/media-storage.ts (new) — saveMediaFile({translationKey, name, mime, stream}) writes the stream to public/uploads/<key>/<name>.<ext>. Exports ALLOWED_MIME and extForMime helpers.
Problem: the upload endpoint needs to land binaries on disk without buffering 1GB videos in memory, while enforcing the project's MIME whitelist and rejecting any name that hasn't been pre-slugified.
Solution: pipeline the incoming Readable to fs.createWriteStream through a counting Transform so the resulting size is reported back. Reject unknown mimes (415-level), non-normalized names (400-level), and any collision with an existing basename (any extension) so two files cannot share the same marker key.
Notes: location is overridable via MEDIA_UPLOADS_ROOT. The function does not touch _meta.json — that responsibility lives in lib/blog/media-meta.ts. No retry or partial-cleanup on stream errors v1; the route handler is expected to clean up if needed.
EOF
)"
```

---

## Phase C — Render-time resolver

### Task C1: `<MediaMissing>` component + register in MDX components

**Files:**
- Create: `components/blog/MediaMissing.tsx`
- Modify: `components/blog/mdx-components.tsx`

- [ ] **Step 1: Write `MediaMissing.tsx`**

```tsx
// components/blog/MediaMissing.tsx
"use client"

import * as React from "react"

interface Props {
  kind: "image" | "video"
  name: string
  reason?: "not_found" | "kind_mismatch"
}

export function MediaMissing({ kind, name, reason }: Props) {
  const isDev = process.env.NODE_ENV !== "production"
  return (
    <div
      role="img"
      aria-label={`Media missing: ${name}`}
      className="my-6 flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500"
    >
      <span>
        ⚠️ media missing: <code>{name}</code> ({kind})
        {isDev && reason ? ` — ${reason}` : null}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Register it in the MDX components map**

Open `components/blog/mdx-components.tsx`, import `MediaMissing`, and add it to the exported map. Example (adapt to the existing object shape):

```tsx
import { MediaMissing } from "./MediaMissing"
// ...
export const MDXComponents = {
  // ... existing entries
  MediaMissing,
}
```

- [ ] **Step 3: Verify the build still compiles**

```
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/blog/MediaMissing.tsx components/blog/mdx-components.tsx
git commit -m "$(cat <<'EOF'
feat(blog): add MediaMissing placeholder component

Scope: components/blog/MediaMissing.tsx (new) and registration in components/blog/mdx-components.tsx.
Problem: when a marker like [image:foo] cannot be resolved against _meta.json (file missing or kind mismatch), the rendered post needs a visible placeholder instead of either silently dropping the marker or breaking the page.
Solution: a small dashed-border block with the missing name and kind. Reason text appears only in development to surface diagnostics during authoring without leaking to readers.
Notes: registered in the same MDXComponents map already passed to <MDXRemote> in components/blog/blog-post.tsx, so the resolver can emit it via the substituted MDX.
EOF
)"
```

---

### Task C2: Marker tokenizer + resolver

**Files:**
- Create: `lib/blog/media-markers.ts`
- Test: `__tests__/lib/media-markers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/media-markers.test.ts
import { expandMarkers, resolveCover } from "@/lib/blog/media-markers"
import type { MediaMeta } from "@/lib/blog/media-meta"

const META: MediaMeta = {
  version: 1,
  files: {
    fachada:          { ext: "jpg", kind: "image", alt: "Fachada", caption: "" },
    testimonio_ferdy: { ext: "mp4", kind: "video", alt: "Testimonio", caption: "Junio 2026" },
    poster:           { ext: "mp4", kind: "video", alt: "P", caption: "" },
  },
}

describe("expandMarkers — body substitution", () => {
  it("renders an image marker as <figure><img/></figure>", () => {
    const out = expandMarkers("Antes [image:fachada] después", META, "ferdy")
    expect(out).toContain('src="/uploads/ferdy/fachada.jpg"')
    expect(out).toContain('alt="Fachada"')
    expect(out).toContain("<figure>")
    expect(out).not.toContain("<figcaption>")
  })

  it("renders a video marker with caption as <figure><video/><figcaption/></figure>", () => {
    const out = expandMarkers("[video:testimonio_ferdy]", META, "ferdy")
    expect(out).toContain('src="/uploads/ferdy/testimonio_ferdy.mp4"')
    expect(out).toContain("controls")
    expect(out).toContain('aria-label="Testimonio"')
    expect(out).toContain("<figcaption>Junio 2026</figcaption>")
  })

  it("renders <MediaMissing reason=not_found /> when name is unknown", () => {
    const out = expandMarkers("[image:unknown]", META, "ferdy")
    expect(out).toContain('<MediaMissing kind="image" name="unknown" reason="not_found" />')
  })

  it("renders <MediaMissing reason=kind_mismatch /> when kind disagrees", () => {
    const out = expandMarkers("[image:testimonio_ferdy]", META, "ferdy")
    expect(out).toContain('<MediaMissing kind="image" name="testimonio_ferdy" reason="kind_mismatch" />')
  })

  it("does not substitute markers inside fenced code blocks", () => {
    const src = "Texto.\n\n```\n[image:fachada]\n```\n\nMás texto."
    const out = expandMarkers(src, META, "ferdy")
    expect(out).toContain("[image:fachada]")
    expect(out).not.toContain('src="/uploads/ferdy/fachada.jpg"')
  })

  it("does not substitute markers inside inline code", () => {
    const out = expandMarkers("Como `[image:fachada]` aquí.", META, "ferdy")
    expect(out).toContain("`[image:fachada]`")
    expect(out).not.toContain('src="/uploads/ferdy/fachada.jpg"')
  })

  it("escapes special HTML characters in alt and caption", () => {
    const meta: MediaMeta = {
      version: 1,
      files: {
        x: { ext: "jpg", kind: "image", alt: 'A & B "c"', caption: "<script>" },
      },
    }
    const out = expandMarkers("[image:x]", meta, "k")
    expect(out).toContain("A &amp; B &quot;c&quot;")
    expect(out).toContain("&lt;script&gt;")
  })

  it("substitutes multiple markers in one body", () => {
    const out = expandMarkers("[image:fachada] y [video:testimonio_ferdy]", META, "ferdy")
    expect(out.match(/<figure>/g)?.length).toBe(2)
  })
})

describe("resolveCover", () => {
  it("returns the URL for a known image cover", () => {
    expect(resolveCover("fachada", META, "ferdy")).toEqual({
      ok: true,
      url: "/uploads/ferdy/fachada.jpg",
    })
  })
  it("returns null for missing cover name", () => {
    expect(resolveCover("nope", META, "ferdy")).toEqual({ ok: false, reason: "not_found" })
  })
  it("returns null for video cover (v1 images only)", () => {
    expect(resolveCover("testimonio_ferdy", META, "ferdy")).toEqual({
      ok: false,
      reason: "kind_mismatch",
    })
  })
  it("returns null when cover is undefined", () => {
    expect(resolveCover(undefined, META, "ferdy")).toEqual({ ok: false, reason: "absent" })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/media-markers.test.ts --no-coverage
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `media-markers.ts`**

```ts
// lib/blog/media-markers.ts
import type { MediaMeta, MediaKind } from "./media-meta"

const MARKER_RE = /\[(image|video):([a-z0-9_]+)\]/g

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildFigure(
  kind: MediaKind,
  url: string,
  alt: string,
  caption: string
): string {
  const altE = escapeHtml(alt)
  const capE = escapeHtml(caption)
  const captionTag = capE ? `<figcaption>${capE}</figcaption>` : ""
  if (kind === "image") {
    return `<figure><img src="${url}" alt="${altE}" />${captionTag}</figure>`
  }
  return `<figure><video src="${url}" controls preload="metadata" aria-label="${altE}"></video>${captionTag}</figure>`
}

function buildMissing(
  kind: MediaKind,
  name: string,
  reason: "not_found" | "kind_mismatch"
): string {
  return `<MediaMissing kind="${kind}" name="${escapeHtml(name)}" reason="${reason}" />`
}

interface Segment {
  type: "code" | "text"
  value: string
}

/**
 * Splits the input into "code" segments (fenced + inline) and "text" segments.
 * Markers are only substituted in "text" segments.
 */
export function tokenize(input: string): Segment[] {
  const out: Segment[] = []
  let i = 0
  let buf = ""
  const flushText = () => {
    if (buf.length > 0) {
      out.push({ type: "text", value: buf })
      buf = ""
    }
  }
  while (i < input.length) {
    // Fenced code block: opening fence at line start
    if ((i === 0 || input[i - 1] === "\n") && input.startsWith("```", i)) {
      flushText()
      const close = input.indexOf("\n```", i + 3)
      if (close === -1) {
        // unterminated fence — treat the rest as code
        out.push({ type: "code", value: input.slice(i) })
        return out
      }
      const end = close + 4 // include closing ```
      out.push({ type: "code", value: input.slice(i, end) })
      i = end
      continue
    }
    // Inline code: backtick run, find matching run of the same length
    if (input[i] === "`") {
      let runLen = 0
      while (input[i + runLen] === "`") runLen++
      const open = "`".repeat(runLen)
      const close = input.indexOf(open, i + runLen)
      if (close === -1) {
        // unterminated — treat as text
        buf += input.slice(i, i + runLen)
        i += runLen
        continue
      }
      flushText()
      const end = close + runLen
      out.push({ type: "code", value: input.slice(i, end) })
      i = end
      continue
    }
    buf += input[i]
    i++
  }
  flushText()
  return out
}

export function expandMarkers(
  body: string,
  meta: MediaMeta,
  translationKey: string
): string {
  const segs = tokenize(body)
  return segs
    .map((seg) => {
      if (seg.type === "code") return seg.value
      return seg.value.replace(MARKER_RE, (_full, kindStr: string, name: string) => {
        const kind = kindStr as MediaKind
        const entry = meta.files[name]
        if (!entry) return buildMissing(kind, name, "not_found")
        if (entry.kind !== kind) return buildMissing(kind, name, "kind_mismatch")
        const url = `/uploads/${translationKey}/${name}.${entry.ext}`
        return buildFigure(kind, url, entry.alt, entry.caption)
      })
    })
    .join("")
}

export type CoverResolution =
  | { ok: true; url: string }
  | { ok: false; reason: "absent" | "not_found" | "kind_mismatch" }

export function resolveCover(
  cover: string | undefined,
  meta: MediaMeta,
  translationKey: string
): CoverResolution {
  if (!cover) return { ok: false, reason: "absent" }
  const entry = meta.files[cover]
  if (!entry) return { ok: false, reason: "not_found" }
  if (entry.kind !== "image") return { ok: false, reason: "kind_mismatch" }
  return { ok: true, url: `/uploads/${translationKey}/${cover}.${entry.ext}` }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/media-markers.test.ts --no-coverage
```
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/media-markers.ts __tests__/lib/media-markers.test.ts
git commit -m "$(cat <<'EOF'
feat(blog): add marker tokenizer and resolver

Scope: lib/blog/media-markers.ts (new) — expandMarkers(body, meta, key) and resolveCover(name, meta, key). Tokenizer splits MDX into "code" and "text" segments so substitutions only happen outside fenced/inline code.
Problem: posts authored by the LLM contain string markers like [image:fachada] / [video:testimonio]. They must turn into real <figure> elements at render time, with placeholders for missing or kind-mismatched references, and never get substituted when they appear inside code samples (so the LLM can write docs about the convention itself).
Solution: a state-machine tokenizer that recognizes ``` fences (line-aligned) and ` ` inline code (backtick-run length matched), then a regex replace inside text segments only. HTML-escape alt and caption to prevent injection from _meta.json. resolveCover restricts v1 covers to images.
Notes: pure functions — no fs/network. The caller (getCompiledPost) is responsible for loading the MediaMeta and invoking expandMarkers before passing the result to next-mdx-remote/serialize.
EOF
)"
```

---

### Task C3: Wire resolver into `getCompiledPost`

**Files:**
- Modify: `lib/blog/posts-runtime.ts:151-171`
- Test: `__tests__/lib/posts-runtime-markers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/posts-runtime-markers.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { getCompiledPost, clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"

describe("getCompiledPost — marker substitution", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gcp-"))
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

  it("substitutes markers in the compiled body", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

Texto introductorio.

[image:fachada]

Cierre.
`
    )
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "Fachada", caption: "" },
    })

    const compiled = await getCompiledPost("ferdy", "es")
    expect(compiled).not.toBeNull()
    // The serialized MDX is in compiled.compiled.compiledSource — we just check
    // that an <img> tag with the resolved URL appears somewhere in it.
    const src = compiled!.compiled.compiledSource
    expect(src).toContain("/uploads/ferdy-2026/fachada.jpg")
  })

  it("falls back to MediaMissing when the marker is unresolved", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

[image:nope]
`
    )
    const compiled = await getCompiledPost("ferdy", "es")
    expect(compiled!.compiled.compiledSource).toContain("MediaMissing")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/posts-runtime-markers.test.ts --no-coverage
```
Expected: FAIL — markers are not being substituted yet.

- [ ] **Step 3: Modify `getCompiledPost`**

In `lib/blog/posts-runtime.ts`, replace the body of `getCompiledPost` (lines 151–171) with:

```ts
export async function getCompiledPost(
  slug: string,
  locale: RuntimeLocale
): Promise<CompiledPost | null> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale && p.published)
  if (!post) return null
  const { readMeta } = await import("./media-meta")
  const { expandMarkers, resolveCover } = await import("./media-markers")
  const meta = await readMeta(post.translationKey)
  const expandedBody = expandMarkers(post.body.raw, meta, post.translationKey)
  const cover = resolveCover(post.cover, meta, post.translationKey)
  const { serialize } = await import("next-mdx-remote/serialize")
  const compiled = await serialize(expandedBody, {
    parseFrontmatter: false,
    blockJS: false,
  })
  return {
    ...post,
    cover: cover.ok ? cover.url : undefined,
    compiled,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/posts-runtime-markers.test.ts --no-coverage
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Run the full posts-runtime test suite to check for regressions**

```
npx jest __tests__/lib/posts-runtime --no-coverage
```
Expected: PASS for all existing posts-runtime tests.

- [ ] **Step 6: Commit**

```bash
git add lib/blog/posts-runtime.ts __tests__/lib/posts-runtime-markers.test.ts
git commit -m "$(cat <<'EOF'
feat(blog): expand media markers and resolve cover in getCompiledPost

Scope: lib/blog/posts-runtime.ts — getCompiledPost() now reads _meta.json for the post's translationKey, runs expandMarkers() over the raw body before serialize(), and replaces post.cover (the frontmatter slug-key) with the resolved /uploads/... URL.
Problem: with the new marker convention in place, the public blog still served the raw [image:X] / [video:X] strings to the reader. The compiler had no resolution step.
Solution: lazy-import media-meta and media-markers (consistent with the existing lazy import of next-mdx-remote/serialize) so test runners that don't compile MDX still load the module. The cover field on the returned post is now either an absolute URL (resolved image) or undefined (absent / kind_mismatch / not_found).
Notes: media-markers tokenizer skips fenced and inline code, so authoring docs about the convention inside a post is safe. The body is substituted at request time; the MDX file on disk keeps the markers literal.
EOF
)"
```

---

## Phase D — JWT for upload

### Task D1: `signUploadToken` / `verifyUploadToken`

**Files:**
- Modify: `lib/oauth-jwt.ts`
- Test: `__tests__/lib/oauth-jwt-upload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/oauth-jwt-upload.test.ts
import { signUploadToken, verifyUploadToken } from "@/lib/oauth-jwt"

describe("upload JWT", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
  })

  it("signs and verifies a valid token", () => {
    const jwt = signUploadToken({ translationKey: "ferdy-2026" }, 60)
    const claims = verifyUploadToken(jwt)
    expect(claims).not.toBeNull()
    expect(claims!.translationKey).toBe("ferdy-2026")
    expect(claims!.purpose).toBe("media-upload")
  })

  it("rejects a token with the wrong purpose", () => {
    // Sign with the other helper (access token) and verify with the upload helper
    const wrongPurpose = signUploadToken({ translationKey: "ferdy" }, 60).replace(
      "media-upload",
      "x"
    )
    expect(verifyUploadToken(wrongPurpose)).toBeNull()
  })

  it("rejects an expired token", async () => {
    const jwt = signUploadToken({ translationKey: "ferdy" }, 1)
    await new Promise((r) => setTimeout(r, 1100))
    expect(verifyUploadToken(jwt)).toBeNull()
  })

  it("rejects a tampered token", () => {
    const jwt = signUploadToken({ translationKey: "ferdy" }, 60)
    const tampered = jwt.slice(0, -2) + (jwt.endsWith("AA") ? "BB" : "AA")
    expect(verifyUploadToken(tampered)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/oauth-jwt-upload.test.ts --no-coverage
```
Expected: FAIL — `signUploadToken` and `verifyUploadToken` are not exported.

- [ ] **Step 3: Add helpers to `lib/oauth-jwt.ts`**

Append the following to `lib/oauth-jwt.ts`:

```ts
export type UploadTokenClaims = {
  purpose: "media-upload"
  translationKey: string
  iat: number
  exp: number
  iss: string
}

export function signUploadToken(
  payload: { translationKey: string },
  ttlSeconds = 900
): string {
  const jwt = require("jsonwebtoken")
  const claims = {
    purpose: "media-upload" as const,
    translationKey: payload.translationKey,
    iss: getIssuer(),
  }
  return jwt.sign(claims, getJwtSecret(), { algorithm: "HS256", expiresIn: ttlSeconds })
}

export function verifyUploadToken(token: string): UploadTokenClaims | null {
  try {
    const jwt = require("jsonwebtoken")
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as UploadTokenClaims
    if (decoded.purpose !== "media-upload") return null
    if (typeof decoded.translationKey !== "string" || decoded.translationKey.length === 0) return null
    return decoded
  } catch {
    return null
  }
}
```

(Adjust the `import` style to match what's already at the top of `lib/oauth-jwt.ts`. If it uses `import jwt from "jsonwebtoken"`, reuse that import instead of `require`.)

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/oauth-jwt-upload.test.ts --no-coverage
```
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/oauth-jwt.ts __tests__/lib/oauth-jwt-upload.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): add upload-scoped JWT helpers

Scope: lib/oauth-jwt.ts — signUploadToken({translationKey}, ttl) and verifyUploadToken(jwt).
Problem: media uploads need a short-lived bearer token with a strict scope so the browser-side form can authenticate without an admin session cookie. The existing access-token helpers carry too broad a payload for this use.
Solution: a dedicated pair of helpers signing JWTs with purpose:"media-upload" + translationKey + 15-min default TTL, validating purpose strictly on verify.
Notes: reuses JWT_SECRET and the HS256 algorithm already used by access tokens; no new env vars.
EOF
)"
```

---

## Phase E — Upload endpoints

### Task E1: `GET /api/admin/media/token-info`

**Files:**
- Create: `app/api/admin/media/token-info/route.ts`
- Test: included in `__tests__/api/media-upload.test.ts` (Task E3)

- [ ] **Step 1: Implement the route**

```ts
// app/api/admin/media/token-info/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { findPostsByTranslationKey } from "@/lib/blog/translation-key"
import { readMeta } from "@/lib/blog/media-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || ""
  const claims = verifyUploadToken(token)
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const siblings = await findPostsByTranslationKey(claims.translationKey)
  const meta = await readMeta(claims.translationKey)
  const existingMedia = Object.entries(meta.files).map(([name, e]) => ({
    name,
    kind: e.kind,
    ext: e.ext,
    alt: e.alt,
    caption: e.caption,
    url: `/uploads/${claims.translationKey}/${name}.${e.ext}`,
  }))
  return NextResponse.json({
    translationKey: claims.translationKey,
    siblings: siblings.map((p) => ({ slug: p.slug, locale: p.locale, title: p.title })),
    existingMedia,
    expiresAt: claims.exp * 1000,
  })
}
```

- [ ] **Step 2: Defer the test to Task E3** (the API test file groups upload + commit + token-info together).

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/media/token-info/route.ts
git commit -m "$(cat <<'EOF'
feat(api): add GET /api/admin/media/token-info

Scope: app/api/admin/media/token-info/route.ts — verifies the upload JWT, returns the translationKey, the list of post siblings (slug/locale/title) and the existingMedia list read from _meta.json.
Problem: the upload form mounts client-side from a URL with a token in the query string; it needs a server-side endpoint that decodes the token (so it never ships JWT_SECRET to the browser) and surfaces context for the page header (which posts will share these uploads, what's already there).
Solution: read-only handler that returns 401 on invalid/expired tokens and a JSON payload with everything the form needs.
Notes: uses force-dynamic and runtime="nodejs" because verifyUploadToken depends on the jsonwebtoken package and the route must read from disk.
EOF
)"
```

---

### Task E2: `POST /api/admin/media/upload` (per-file streaming)

**Files:**
- Create: `app/api/admin/media/upload/route.ts`
- Test: included in `__tests__/api/media-upload.test.ts` (Task E3)

- [ ] **Step 1: Implement the route**

```ts
// app/api/admin/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Readable } from "stream"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { saveMediaFile, MediaStorageError, ALLOWED_MIME } from "@/lib/blog/media-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const MAX_BYTES = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || 1_073_741_824) // 1 GB

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return NextResponse.json({ error: "missing_token" }, { status: 401 })
  const claims = verifyUploadToken(m[1])
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const mime = (req.headers.get("content-type") || "").split(";")[0].trim()
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) {
    return NextResponse.json({ error: "mime_not_allowed", mime }, { status: 415 })
  }

  const declaredSize = Number(req.headers.get("content-length") || 0)
  if (declaredSize > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", limit: MAX_BYTES }, { status: 413 })
  }

  const name = (req.headers.get("x-media-name") || "").trim()
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 })

  if (!req.body) return NextResponse.json({ error: "missing_body" }, { status: 400 })
  const stream = Readable.fromWeb(req.body as unknown as import("stream/web").ReadableStream)

  try {
    const result = await saveMediaFile({
      translationKey: claims.translationKey,
      name,
      mime,
      stream,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MediaStorageError) {
      const status =
        err.code === "mime"
          ? 415
          : err.code === "name"
            ? 400
            : err.code === "exists"
              ? 409
              : 500
      return NextResponse.json({ error: err.code, message: err.message }, { status })
    }
    return NextResponse.json({ error: "io_error", message: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Defer the test to Task E3.**

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/media/upload/route.ts
git commit -m "$(cat <<'EOF'
feat(api): add POST /api/admin/media/upload streaming endpoint

Scope: app/api/admin/media/upload/route.ts — single-file streaming upload guarded by the upload JWT. Reads X-Media-Name from headers, content type from Content-Type, pipes request.body to media-storage.saveMediaFile.
Problem: the form needs to push potentially gigabyte-sized binaries without buffering them in memory and without re-using the broader admin auth.
Solution: Web stream → Node Readable via Readable.fromWeb, then delegate to lib/blog/media-storage. Map MediaStorageError codes to 415/400/409/500 HTTP statuses.
Notes: maxDuration=300 raises the route timeout for big uploads; MEDIA_UPLOAD_MAX_BYTES env caps content-length at 1 GB by default. _meta.json is not touched here — that step is the /commit endpoint.
EOF
)"
```

---

### Task E3: `POST /api/admin/media/upload/commit` + integration tests

**Files:**
- Create: `app/api/admin/media/upload/commit/route.ts`
- Test: `__tests__/api/media-upload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/media-upload.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { Readable } from "stream"
import { GET as tokenInfo } from "@/app/api/admin/media/token-info/route"
import { POST as upload } from "@/app/api/admin/media/upload/route"
import { POST as commit } from "@/app/api/admin/media/upload/commit/route"
import { signUploadToken } from "@/lib/oauth-jwt"
import { clearMediaMetaCache } from "@/lib/blog/media-meta"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

function jsonReq(url: string, init: RequestInit = {}): Request {
  return new Request(url, { ...init })
}

function makeStreamRequest(
  url: string,
  body: Buffer,
  headers: Record<string, string>
): Request {
  // Node's Request supports ReadableStream bodies via the global Request constructor in undici
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(body))
      c.close()
    },
  })
  return new Request(url, { method: "POST", body: stream as any, headers, duplex: "half" } as any)
}

describe("media upload API", () => {
  let tmp: string
  let token: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "api-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    fs.mkdirSync(path.join(tmp, "uploads"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    process.env.MEDIA_UPLOADS_ROOT = path.join(tmp, "uploads")
    process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

Body
`
    )
    token = signUploadToken({ translationKey: "ferdy-2026" }, 60)
    clearMediaMetaCache()
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
    delete process.env.MEDIA_UPLOADS_ROOT
    delete process.env.JWT_SECRET
  })

  it("rejects upload without token (401)", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("x"), {
      "content-type": "image/jpeg",
      "x-media-name": "foo",
    }) as any)
    expect(res.status).toBe(401)
  })

  it("rejects upload with disallowed MIME (415)", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("x"), {
      authorization: `Bearer ${token}`,
      "content-type": "application/x-dosexec",
      "x-media-name": "foo",
    }) as any)
    expect(res.status).toBe(415)
  })

  it("uploads OK and writes the binary", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    expect(res.status).toBe(200)
    const file = path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg")
    expect(fs.existsSync(file)).toBe(true)
  })

  it("commits _meta.json after a batch", async () => {
    await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    const res = await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "fachada", alt: "Fachada", caption: "" }],
        }),
      }) as any
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { files: Array<{ name: string; url: string }> }
    expect(data.files[0].url).toBe("/uploads/ferdy-2026/fachada.jpg")
    const meta = JSON.parse(
      fs.readFileSync(path.join(tmp, "uploads", "ferdy-2026", "_meta.json"), "utf-8")
    )
    expect(meta.files.fachada.alt).toBe("Fachada")
  })

  it("commit rejects when binary is missing (400)", async () => {
    const res = await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ files: [{ name: "ghost", alt: "", caption: "" }] }),
      }) as any
    )
    expect(res.status).toBe(400)
  })

  it("token-info returns siblings and existing media", async () => {
    await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ files: [{ name: "fachada", alt: "F", caption: "" }] }),
      }) as any
    )
    const res = await tokenInfo({
      nextUrl: { searchParams: new URLSearchParams({ token }) },
    } as any)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { existingMedia: Array<{ name: string }> }
    expect(data.existingMedia.map((m) => m.name)).toEqual(["fachada"])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/api/media-upload.test.ts --no-coverage
```
Expected: FAIL — commit route does not exist yet.

- [ ] **Step 3: Implement the commit route**

```ts
// app/api/admin/media/upload/commit/route.ts
import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs/promises"
import * as path from "path"
import { verifyUploadToken } from "@/lib/oauth-jwt"
import { writeMeta, type MediaMetaEntry, type MediaKind } from "@/lib/blog/media-meta"
import { ALLOWED_MIME } from "@/lib/blog/media-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface BatchEntry {
  name: string
  alt?: string
  caption?: string
}

const KIND_BY_EXT: Record<string, MediaKind> = {
  jpg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

async function findFile(dir: string, name: string): Promise<{ ext: string; kind: MediaKind } | null> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return null
  }
  for (const e of entries) {
    if (e === "_meta.json" || e === ".lock") continue
    const m = e.match(/^(.+)\.([^.]+)$/)
    if (!m) continue
    if (m[1] !== name) continue
    const ext = m[2]
    const kind = KIND_BY_EXT[ext]
    if (!kind) continue
    return { ext, kind }
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return NextResponse.json({ error: "missing_token" }, { status: 401 })
  const claims = verifyUploadToken(m[1])
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { files?: BatchEntry[] } | null
  if (!body || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "missing_files" }, { status: 400 })
  }

  const dir = path.join(getRoot(), claims.translationKey)
  const newEntries: Record<string, MediaMetaEntry> = {}
  const out: Array<{ name: string; url: string; ext: string; kind: MediaKind; alt: string; caption: string }> = []

  for (const f of body.files) {
    if (!f || typeof f.name !== "string") {
      return NextResponse.json({ error: "bad_entry" }, { status: 400 })
    }
    const found = await findFile(dir, f.name)
    if (!found) {
      return NextResponse.json({ error: "binary_missing", name: f.name }, { status: 400 })
    }
    const entry: MediaMetaEntry = {
      ext: found.ext,
      kind: found.kind,
      alt: f.alt || "",
      caption: f.caption || "",
    }
    newEntries[f.name] = entry
    out.push({
      name: f.name,
      ext: entry.ext,
      kind: entry.kind,
      alt: entry.alt,
      caption: entry.caption,
      url: `/uploads/${claims.translationKey}/${f.name}.${entry.ext}`,
    })
  }

  await writeMeta(claims.translationKey, newEntries)
  return NextResponse.json({ ok: true, files: out })
}
// Note: ALLOWED_MIME is imported only to keep the route's surface coherent
// with /upload — it's not used here directly.
void ALLOWED_MIME
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/api/media-upload.test.ts --no-coverage
```
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/media/upload/commit/route.ts __tests__/api/media-upload.test.ts
git commit -m "$(cat <<'EOF'
feat(api): add POST /api/admin/media/upload/commit

Scope: app/api/admin/media/upload/commit/route.ts and integration tests covering token-info, upload, and commit.
Problem: after a batch of single-file uploads writes binaries to disk, the metadata layer (_meta.json) still needs a single atomic merge step. Doing it per-file would risk inconsistent state on failure.
Solution: read each batch entry, locate the binary on disk to derive ext + kind, then call writeMeta which acquires the per-translationKey lock and renames a tmp JSON in place. Reject the whole commit if any binary is missing.
Notes: integration tests cover happy path, missing token, disallowed MIME, missing binary on commit, and token-info returning siblings + existingMedia. The form will only ever call /commit after every /upload in the batch resolves OK.
EOF
)"
```

---

## Phase F — Upload form UI

### Task F1: `/admin/media-upload` page + form component

**Files:**
- Create: `app/admin/media-upload/page.tsx`
- Create: `app/admin/media-upload/MediaUploadForm.tsx`

This task is UI-only — the contract is fully covered by the API tests above plus a manual smoke pass after implementation. No new Jest tests required.

- [ ] **Step 1: Implement `page.tsx` (server component, just the shell)**

```tsx
// app/admin/media-upload/page.tsx
import { MediaUploadForm } from "./MediaUploadForm"

export const dynamic = "force-dynamic"

export default function MediaUploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Subir media</h1>
      <p className="mb-6 text-sm text-gray-500">
        Esta página requiere un token de subida emitido por el chat de Claude
        (<code>posts_request_upload</code>). El token es válido 15 minutos.
      </p>
      <MediaUploadForm />
    </main>
  )
}
```

- [ ] **Step 2: Implement `MediaUploadForm.tsx` (client)**

```tsx
// app/admin/media-upload/MediaUploadForm.tsx
"use client"

import * as React from "react"
import { slugifyMediaName } from "@/lib/blog/media-naming"

interface ExistingItem {
  name: string
  kind: "image" | "video"
  ext: string
  alt: string
  caption: string
  url: string
}

interface TokenInfo {
  translationKey: string
  siblings: Array<{ slug: string; locale: string; title: string }>
  existingMedia: ExistingItem[]
  expiresAt: number
}

interface Row {
  id: string
  file: File
  name: string
  alt: string
  caption: string
  status: "idle" | "uploading" | "ok" | "error"
  error?: string
}

export function MediaUploadForm() {
  const [token, setToken] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<TokenInfo | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Row[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState<{ names: string[] } | null>(null)

  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token")
    if (!t) {
      setError("No hay token en la URL.")
      return
    }
    setToken(t)
    fetch(`/api/admin/media/token-info?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as TokenInfo
      })
      .then(setInfo)
      .catch((e: Error) => setError(`Token inválido o expirado (${e.message}).`))
  }, [])

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: Row[] = Array.from(files).map((file) => {
      const base = file.name.replace(/\.[^.]+$/, "")
      let name = ""
      try {
        name = slugifyMediaName(base)
      } catch {
        name = ""
      }
      return {
        id: crypto.randomUUID(),
        file,
        name,
        alt: "",
        caption: "",
        status: "idle",
      }
    })
    setRows((r) => [...r, ...next])
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id))
  }

  function validate(): string | null {
    if (rows.length === 0) return "Añade al menos un fichero."
    const names = new Set<string>(info?.existingMedia.map((m) => m.name) || [])
    for (const r of rows) {
      if (!r.name) return `Falta el nombre para ${r.file.name}.`
      try {
        if (slugifyMediaName(r.name) !== r.name) {
          return `Nombre no normalizado: ${r.name}`
        }
      } catch {
        return `Nombre vacío para ${r.file.name}.`
      }
      if (names.has(r.name)) return `El nombre "${r.name}" ya existe.`
      names.add(r.name)
    }
    return null
  }

  async function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    if (!token) return
    try {
      // Sequential per-file upload so one failure aborts the batch.
      for (const row of rows) {
        updateRow(row.id, { status: "uploading" })
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": row.file.type,
            "x-media-name": row.name,
          },
          body: row.file,
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          updateRow(row.id, { status: "error", error: data.error || `HTTP ${res.status}` })
          throw new Error(`Falla en ${row.name}: ${data.error || res.status}`)
        }
        updateRow(row.id, { status: "ok" })
      }
      const commitRes = await fetch("/api/admin/media/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          files: rows.map((r) => ({ name: r.name, alt: r.alt, caption: r.caption })),
        }),
      })
      if (!commitRes.ok) {
        const data = (await commitRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(`Commit falló: ${data.error || commitRes.status}`)
      }
      setDone({ names: rows.map((r) => r.name) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !info) return <div className="text-red-600">{error}</div>
  if (!info) return <div>Cargando…</div>
  if (done) {
    return (
      <div>
        <p className="mb-4 text-green-700">
          ✅ {done.names.length} fichero(s) subidos: <code>{done.names.join(", ")}</code>
        </p>
        <p className="text-sm text-gray-600">
          Vuelve al chat de Claude y dile al asistente los nombres para que componga el post.
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
        <p className="font-medium">
          translationKey: <code>{info.translationKey}</code>
        </p>
        <p className="text-sm text-gray-600">
          {info.siblings.length} post(s) hermanos: {info.siblings.map((s) => s.locale).join(", ")}
        </p>
        {info.existingMedia.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Ya subidos: {info.existingMedia.map((m) => m.name).join(", ")}
          </p>
        )}
      </header>

      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => addFiles(e.target.files)}
        className="mb-4 block"
      />

      {rows.map((row) => (
        <div key={row.id} className="mb-3 rounded border border-gray-200 p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500">{row.file.name} ({Math.round(row.file.size / 1024)} KB)</p>
              <label className="mt-2 block text-xs">Nombre</label>
              <input
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                onBlur={(e) => {
                  try {
                    updateRow(row.id, { name: slugifyMediaName(e.target.value) })
                  } catch {
                    /* leave as-is, validate() will catch */
                  }
                }}
                className="w-full border px-2 py-1 text-sm"
              />
              <label className="mt-2 block text-xs">Alt</label>
              <input
                value={row.alt}
                onChange={(e) => updateRow(row.id, { alt: e.target.value })}
                className="w-full border px-2 py-1 text-sm"
              />
              <label className="mt-2 block text-xs">Caption</label>
              <input
                value={row.caption}
                onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                className="w-full border px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-500">{row.status}</span>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs text-red-600 underline"
              >
                quitar
              </button>
            </div>
          </div>
          {row.error && <p className="mt-1 text-xs text-red-600">{row.error}</p>}
        </div>
      ))}

      {error && <p className="mb-3 text-red-600">{error}</p>}

      <button
        type="button"
        disabled={submitting || rows.length === 0}
        onClick={submit}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Subiendo…" : "Subir todo"}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Manual smoke test** (run `npm run dev`, visit `/admin/media-upload?token=<jwt>` after generating a token via a Node REPL: `node -e "process.env.JWT_SECRET='...'; console.log(require('./lib/oauth-jwt').signUploadToken({translationKey:'test'}, 600))"`).

- [ ] **Step 4: `npx tsc --noEmit`** to ensure the page compiles.

- [ ] **Step 5: Commit**

```bash
git add app/admin/media-upload/page.tsx app/admin/media-upload/MediaUploadForm.tsx
git commit -m "$(cat <<'EOF'
feat(admin): add /admin/media-upload form

Scope: app/admin/media-upload/page.tsx and app/admin/media-upload/MediaUploadForm.tsx (client component).
Problem: the LLM hands the user a URL with a JWT; the user needs a UI that decodes the token, lists existing media, accepts multiple files with per-row Name/Alt/Caption, and runs the batch upload + commit atomically.
Solution: server component shell that mounts the client form, which fetches /token-info on mount, sequentially POSTs each file to /upload, and then calls /commit with the metadata. Names auto-fill from the file's basename via slugifyMediaName and re-normalize on blur. A failure mid-batch aborts and surfaces an error; commit only runs after all files succeed.
Notes: no Jest tests for the UI itself — the underlying API is covered by __tests__/api/media-upload.test.ts. Manual smoke required after deploy.
EOF
)"
```

---

## Phase G — MCP tools

### Task G1: Add `instructions` to `initialize` + `posts_request_upload`

**Files:**
- Modify: `lib/mcp/rpc-handler.ts`
- Test: `__tests__/lib/mcp-rpc-handler.test.ts` (extend)

- [ ] **Step 1: Write failing tests** (extend the existing test file — append these `it` blocks; keep the file's existing test scaffold):

```ts
// __tests__/lib/mcp-rpc-handler.test.ts (append)
import { handleRpcCall } from "@/lib/mcp/rpc-handler"

describe("rpc-handler — initialize.instructions", () => {
  it("includes instructions describing the marker convention", async () => {
    const res = (await handleRpcCall({ jsonrpc: "2.0", id: 1, method: "initialize" })) as any
    expect(res.result.instructions).toMatch(/\[image:/)
    expect(res.result.instructions).toMatch(/\[video:/)
    expect(res.result.instructions).toMatch(/cover/)
  })
})

describe("rpc-handler — posts_request_upload", () => {
  // (these tests need CONTENT_ROOT + MEDIA_UPLOADS_ROOT + JWT_SECRET — copy
  // the beforeEach/afterEach pattern from __tests__/api/media-upload.test.ts)

  it("returns 401-equivalent error without posts:write scope", async () => {
    const res = (await handleRpcCall(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "posts_request_upload", arguments: { slug: "ferdy", locale: "es" } } },
      { claims: null }
    )) as any
    expect(res.error).toBeDefined()
  })

  it("returns uploadUrl + translationKey for an existing post (with scope)", async () => {
    // Set up a post on disk in beforeEach.
    const res = (await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_request_upload", arguments: { slug: "ferdy", locale: "es" } },
      },
      { claims: { sub: "u", scope: "posts:write" } as any }
    )) as any
    const text = JSON.parse(res.result.content[0].text)
    expect(text.uploadUrl).toMatch(/\/admin\/media-upload\?token=/)
    expect(text.translationKey).toBe("ferdy-2026")
    expect(Array.isArray(text.existingMedia)).toBe(true)
  })

  it("returns not-found error for a missing slug", async () => {
    const res = (await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_request_upload", arguments: { slug: "ghost", locale: "es" } },
      },
      { claims: { sub: "u", scope: "posts:write" } as any }
    )) as any
    expect(res.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```
Expected: FAIL — `instructions` missing and tool unknown.

- [ ] **Step 3: Modify `rpc-handler.ts`**

In the `initialize` branch (around line 201):

```ts
  if (req.method === "initialize") {
    return successResponse(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
      instructions:
        "Blog del sitio Evolve2Digital. Soporta media inline vía markers en MDX: " +
        "`[image:nombre]` y `[video:nombre]` en el body, y `cover: nombre` en frontmatter. " +
        "Los nombres son slug-keys (lowercase, ASCII, `_` separador) que apuntan a ficheros " +
        "ya subidos. Para listar lo disponible llama a `posts_list_media`. Para subir nueva " +
        "media llama primero a `posts_request_upload`, que devuelve una URL para que el " +
        "usuario complete la subida vía form. Después usa `posts_create` o `posts_update_body` " +
        "con los markers ya escritos. `posts_validate` hace pre-flight de markers rotos.",
    })
  }
```

Append to the `tools` array in `toolsList()`:

```ts
      {
        name: "posts_request_upload",
        description:
          "Pide una URL de subida de fotos/vídeos para un post. Devuelve también la lista " +
          "de media ya subida a ese post (mismo translationKey en es/en/it).",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
```

Add the tool branch in `tools/call` (after `posts_delete`):

```ts
    if (toolName === "posts_request_upload") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params")
      }
      const { getTranslationKeyForSlug } = await import("@/lib/blog/translation-key")
      const key = await getTranslationKeyForSlug(slug, locale)
      if (!key) return errorResponse(id, -32004, "Not found")
      const { signUploadToken } = await import("@/lib/oauth-jwt")
      const ttl = 900
      const token = signUploadToken({ translationKey: key }, ttl)
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
      const { readMeta } = await import("@/lib/blog/media-meta")
      const meta = await readMeta(key)
      const existingMedia = Object.entries(meta.files).map(([name, e]) => ({
        name,
        kind: e.kind,
        ext: e.ext,
        alt: e.alt,
        caption: e.caption,
        url: `/uploads/${key}/${name}.${e.ext}`,
      }))
      return successResponse(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              uploadUrl: `${base}/admin/media-upload?token=${encodeURIComponent(token)}`,
              expiresAt: Math.floor(Date.now() / 1000) + ttl,
              translationKey: key,
              existingMedia,
            }),
          },
        ],
      })
    }
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```
Expected: PASS — instructions test + 3 request_upload tests.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/rpc-handler.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "$(cat <<'EOF'
feat(mcp): add posts_request_upload and initialize.instructions

Scope: lib/mcp/rpc-handler.ts — extends toolsList() with posts_request_upload, adds the matching tools/call branch, and returns an "instructions" string in the initialize response that describes the marker convention.
Problem: the LLM connecting through the MCP needs (a) a way to discover the marker convention without prompting and (b) a tool that surfaces the upload URL plus existing media for a post.
Solution: instructions live at server level so any MCP client surfaces them once on connect; the new tool resolves the slug to its translationKey, signs a 15-minute upload JWT, and returns existingMedia from _meta.json so the LLM can show the user what's already there.
Notes: scope guard reuses the existing posts:write check. No new env vars.
EOF
)"
```

---

### Task G2: `posts_update_body`

**Files:**
- Modify: `lib/blog/posts-write.ts` (add `updatePostBody` exported function)
- Modify: `lib/mcp/rpc-handler.ts` (add tool + branch)
- Test: `__tests__/lib/posts-write-update-body.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/posts-write-update-body.test.ts --no-coverage
```
Expected: FAIL — `updatePostBody` not exported.

- [ ] **Step 3: Implement `updatePostBody` in `lib/blog/posts-write.ts`**

Append to `lib/blog/posts-write.ts` (don't modify existing exports):

```ts
import matter from "gray-matter"

export interface UpdatePostBodyInput {
  slug: string
  locale: Locale
  content: string
}

export async function updatePostBody(input: UpdatePostBodyInput): Promise<void> {
  const { listPostsFromDisk, clearPostsRuntimeCache } = await import("./posts-runtime")
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === input.slug && p.locale === input.locale)
  if (!post) throw new PostsWriteError("NOT_FOUND", `Post ${input.slug}/${input.locale} not found`)
  const filePath = path.join(getContentRoot(), "content", post._raw.sourceFilePath)
  const fs = await import("fs/promises")
  const raw = await fs.readFile(filePath, "utf-8")
  const parsed = matter(raw)
  const next = matter.stringify(input.content, parsed.data)
  await fs.writeFile(filePath, next, "utf-8")
  clearPostsRuntimeCache()
}
```

(Top-level imports may already include `path` and `matter`. Check the existing top of `lib/blog/posts-write.ts` and reuse.)

- [ ] **Step 4: Wire the MCP tool**

In `lib/mcp/rpc-handler.ts`, append to `toolsList()`:

```ts
      {
        name: "posts_update_body",
        description:
          "Reescribe el cuerpo MDX de un post existente. El frontmatter se mantiene. " +
          "El `content` puede contener markers `[image:nombre]`/`[video:nombre]`. " +
          "Operación destructiva — revierte con git si hace falta.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
            content: { type: "string", minLength: 1 },
          },
          required: ["slug", "locale", "content"],
        },
      },
```

Add the branch in `tools/call`:

```ts
    if (toolName === "posts_update_body") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      const content = typeof args.content === "string" ? args.content : ""
      if (!slug.trim() || !locale || !content) {
        return errorResponse(id, -32602, "Invalid params")
      }
      try {
        const { updatePostBody } = await import("@/lib/blog/posts-write")
        await updatePostBody({ slug, locale, content })
        return successResponse(id, { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] })
      } catch (err) {
        const { isPostsWriteError } = await import("@/lib/blog/posts-write")
        if (isPostsWriteError(err) && err.code === "NOT_FOUND") {
          return errorResponse(id, -32004, "Not found")
        }
        return errorResponse(id, -32000, "Update failed", { message: String(err) })
      }
    }
```

- [ ] **Step 5: Run test to verify it passes**

```
npx jest __tests__/lib/posts-write-update-body.test.ts __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/blog/posts-write.ts lib/mcp/rpc-handler.ts __tests__/lib/posts-write-update-body.test.ts
git commit -m "$(cat <<'EOF'
feat(mcp): add posts_update_body tool

Scope: lib/blog/posts-write.ts adds updatePostBody({slug, locale, content}). lib/mcp/rpc-handler.ts wires the new MCP tool with a posts:write scope guard.
Problem: with the marker convention in place, the LLM frequently needs to add or move markers in an existing post (e.g. after a fresh batch of media uploads). Without an update tool, the only path is delete + create which loses the frontmatter and date.
Solution: parse the existing MDX with gray-matter, replace only the body, preserve the data block, write atomically. Clears the posts-runtime cache so the next request reflects the change.
Notes: full-body rewrite, no merge — the LLM is the sole producer of prose in this flow. The .mdx file is in git, so an undo is git checkout HEAD~1.
EOF
)"
```

---

### Task G3: `posts_list_media`

**Files:**
- Modify: `lib/mcp/rpc-handler.ts`
- Test: `__tests__/lib/mcp-rpc-handler.test.ts` (extend)

- [ ] **Step 1: Write failing tests**

```ts
// Append to __tests__/lib/mcp-rpc-handler.test.ts
describe("rpc-handler — posts_list_media", () => {
  it("returns empty list when _meta.json is absent", async () => {
    const res = (await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_list_media", arguments: { slug: "ferdy", locale: "es" } },
      },
      { claims: { sub: "u", scope: "posts:read" } as any }
    )) as any
    const text = JSON.parse(res.result.content[0].text)
    expect(text.files).toEqual([])
  })

  it("returns the existing media list", async () => {
    // beforeEach is expected to have written a post + a _meta.json with one file
    const res = (await handleRpcCall(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "posts_list_media", arguments: { slug: "ferdy", locale: "es" } },
      },
      { claims: { sub: "u", scope: "posts:read" } as any }
    )) as any
    const text = JSON.parse(res.result.content[0].text)
    expect(text.files.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```

- [ ] **Step 3: Add tool to `toolsList()`**

```ts
      {
        name: "posts_list_media",
        description:
          "Lista la media (imágenes/vídeos) ya subida a un post. Útil antes de escribir " +
          "markers en el body, para confirmar qué nombres están disponibles.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
```

Add the `tools/call` branch:

```ts
    if (toolName === "posts_list_media") {
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params")
      }
      const { getTranslationKeyForSlug } = await import("@/lib/blog/translation-key")
      const key = await getTranslationKeyForSlug(slug, locale)
      if (!key) return errorResponse(id, -32004, "Not found")
      const { readMeta } = await import("@/lib/blog/media-meta")
      const meta = await readMeta(key)
      const files = Object.entries(meta.files).map(([name, e]) => ({
        name,
        kind: e.kind,
        ext: e.ext,
        alt: e.alt,
        caption: e.caption,
        url: `/uploads/${key}/${name}.${e.ext}`,
      }))
      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify({ translationKey: key, files }) }],
      })
    }
```

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/rpc-handler.ts __tests__/lib/mcp-rpc-handler.test.ts
git commit -m "$(cat <<'EOF'
feat(mcp): add posts_list_media tool

Scope: lib/mcp/rpc-handler.ts — toolsList() entry plus tools/call branch reading _meta.json for the post's translationKey.
Problem: the LLM needs an authoritative source of which media slug-keys are available before writing markers; otherwise it guesses and produces broken posts.
Solution: read-only tool returning the file list (name, kind, ext, alt, caption, url) for the resolved translationKey. Empty list when _meta.json is absent.
Notes: scope is posts:read — the same scope used by posts_get and posts_search.
EOF
)"
```

---

### Task G4: `posts_validate`

**Files:**
- Create: `lib/blog/posts-validate.ts`
- Modify: `lib/mcp/rpc-handler.ts`
- Test: `__tests__/lib/posts-validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/posts-validate.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { validatePost } from "@/lib/blog/posts-validate"
import { writeMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("validatePost", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v-"))
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

  it("flags missing markers and unused media", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: nope
---

[image:fachada]
[video:ghost]
`
    )
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "F", caption: "" },
      orphan:  { ext: "jpg", kind: "image", alt: "O", caption: "" },
    })
    const out = await validatePost("ferdy", "es")
    expect(out.ok).toBe(false)
    expect(out.missingMarkers.find((m) => m.name === "ghost")?.reason).toBe("not_found")
    expect(out.unusedMedia).toContain("orphan")
    expect(out.coverOk).toBe(false)
  })

  it("ok=true on a clean post", async () => {
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
cover: fachada
---

[image:fachada]
`
    )
    await writeMeta("ferdy-2026", {
      fachada: { ext: "jpg", kind: "image", alt: "F", caption: "" },
    })
    const out = await validatePost("ferdy", "es")
    expect(out.ok).toBe(true)
    expect(out.missingMarkers).toEqual([])
    expect(out.unusedMedia).toEqual([])
    expect(out.coverOk).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/posts-validate.test.ts --no-coverage
```

- [ ] **Step 3: Implement `lib/blog/posts-validate.ts`**

```ts
// lib/blog/posts-validate.ts
import { listPostsFromDisk, type RuntimeLocale } from "./posts-runtime"
import { readMeta } from "./media-meta"
import { tokenize } from "./media-markers"

export interface ValidationResult {
  ok: boolean
  missingMarkers: Array<{ kind: "image" | "video"; name: string; reason: "not_found" | "kind_mismatch" }>
  unusedMedia: string[]
  coverOk: boolean
}

const MARKER_RE = /\[(image|video):([a-z0-9_]+)\]/g

export async function validatePost(slug: string, locale: RuntimeLocale): Promise<ValidationResult> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  if (!post) {
    return { ok: false, missingMarkers: [], unusedMedia: [], coverOk: false }
  }
  const meta = await readMeta(post.translationKey)
  const segs = tokenize(post.body.raw)
  const used = new Set<string>()
  const missing: ValidationResult["missingMarkers"] = []
  for (const seg of segs) {
    if (seg.type === "code") continue
    let m: RegExpExecArray | null
    while ((m = MARKER_RE.exec(seg.value)) !== null) {
      const kind = m[1] as "image" | "video"
      const name = m[2]
      const entry = meta.files[name]
      if (!entry) missing.push({ kind, name, reason: "not_found" })
      else if (entry.kind !== kind) missing.push({ kind, name, reason: "kind_mismatch" })
      else used.add(name)
    }
  }
  let coverOk = true
  if (post.cover) {
    const c = meta.files[post.cover]
    coverOk = !!c && c.kind === "image"
    if (c) used.add(post.cover)
  }
  const unused = Object.keys(meta.files).filter((n) => !used.has(n))
  return {
    ok: missing.length === 0 && coverOk && (post.cover ? true : true),
    missingMarkers: missing,
    unusedMedia: unused,
    coverOk,
  }
}
```

- [ ] **Step 4: Wire MCP tool**

```ts
      {
        name: "posts_validate",
        description:
          "Comprueba que todos los markers `[image:X]`/`[video:X]` y el `cover` " +
          "del post existan en _meta.json. Sin side effects. Útil antes de `posts_rebuild`.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
```

```ts
    if (toolName === "posts_validate") {
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) return errorResponse(id, -32602, "Invalid params")
      const { validatePost } = await import("@/lib/blog/posts-validate")
      const result = await validatePost(slug, locale)
      return successResponse(id, { content: [{ type: "text", text: JSON.stringify(result) }] })
    }
```

- [ ] **Step 5: Run test to verify it passes**

```
npx jest __tests__/lib/posts-validate.test.ts __tests__/lib/mcp-rpc-handler.test.ts --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add lib/blog/posts-validate.ts lib/mcp/rpc-handler.ts __tests__/lib/posts-validate.test.ts
git commit -m "$(cat <<'EOF'
feat(mcp): add posts_validate tool

Scope: lib/blog/posts-validate.ts (new) — validatePost(slug, locale) returns ok / missingMarkers / unusedMedia / coverOk. lib/mcp/rpc-handler.ts wires the tool.
Problem: the LLM (and the user) need a pre-flight that flags broken markers and orphaned media before triggering posts_rebuild and pushing a broken page to the public site.
Solution: reuse the existing tokenizer from media-markers to scan the body, compare against _meta.json, and report unresolved markers and unused files.
Notes: read-only, posts:read scope. The result object is shaped so the LLM can read it as text and surface a concise summary back to the user.
EOF
)"
```

---

### Task G5: Modify `posts_create` to accept `cover` and `translationKey`

**Files:**
- Modify: `lib/blog/posts-write.ts:56-140` (CreatePostInput + createPost)
- Modify: `lib/mcp/rpc-handler.ts` (posts_create branch)
- Test: `__tests__/lib/posts-write-cover.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/posts-write-cover.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { createPost } from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("createPost — cover and translationKey", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cp-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
  })

  it("writes cover and translationKey into the frontmatter when provided", async () => {
    await createPost({
      title: "Caso Ferdy",
      description: "Reportaje del caso Ferdy",
      content: "Un párrafo. [image:fachada]",
      locale: "es",
      tags: [],
      cover: "fachada",
      translationKey: "ferdy-2026",
    })
    const files = fs.readdirSync(path.join(tmp, "content", "posts"))
    expect(files.length).toBe(1)
    const raw = fs.readFileSync(path.join(tmp, "content", "posts", files[0]), "utf-8")
    expect(raw).toMatch(/cover:\s*fachada/)
    expect(raw).toMatch(/translationKey:\s*ferdy-2026/)
  })

  it("omits cover and uses slug as translationKey when not provided", async () => {
    await createPost({
      title: "Solo",
      description: "post sin media",
      content: "Texto.",
      locale: "es",
      tags: [],
    })
    const files = fs.readdirSync(path.join(tmp, "content", "posts"))
    const raw = fs.readFileSync(path.join(tmp, "content", "posts", files[0]), "utf-8")
    expect(raw).not.toMatch(/^cover:/m)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/posts-write-cover.test.ts --no-coverage
```

- [ ] **Step 3: Modify `lib/blog/posts-write.ts`**

Open `lib/blog/posts-write.ts`. In `CreatePostInput`, add:

```ts
  cover?: string
  translationKey?: string
```

In `createPost`, where the frontmatter is built, add `cover` and `translationKey` lines (only when defined). The function uses `yamlQuote` already; emit:

```
${input.cover ? `cover: ${yamlQuote(input.cover)}\n` : ""}${input.translationKey ? `translationKey: ${yamlQuote(input.translationKey)}\n` : ""}
```

(Adapt to the actual frontmatter assembly in the file.)

- [ ] **Step 4: Modify the `posts_create` MCP branch**

In `lib/mcp/rpc-handler.ts`, in the `posts_create` branch, pass `cover` and `translationKey` from `args` into `createPost`:

```ts
        const result = await createPost({
          title: typeof args.title === "string" ? args.title : "",
          description: typeof args.description === "string" ? args.description : "",
          content: typeof args.content === "string" ? args.content : "",
          locale: (parseLocale(args.locale) ?? "es") as Locale,
          tags: Array.isArray(args.tags)
            ? (args.tags.filter((t) => typeof t === "string") as string[])
            : [],
          date: typeof args.date === "string" ? args.date : undefined,
          author: typeof args.author === "string" ? args.author : undefined,
          published: args.published !== false,
          cover: typeof args.cover === "string" ? args.cover : undefined,
          translationKey: typeof args.translationKey === "string" ? args.translationKey : undefined,
        })
```

Update the tool description in `toolsList()` to mention markers + cover + translationKey:

```ts
        name: "posts_create",
        description:
          "Crea un post nuevo en el blog (requiere scope posts:write). El `content` puede contener " +
          "markers `[image:nombre]`/`[video:nombre]`. `cover` apunta a un nombre de marker " +
          "(imagen) usado como portada. `translationKey` agrupa hermanos i18n; default = slug.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3 },
            description: { type: "string", minLength: 10 },
            content: { type: "string", minLength: 50, description: "Cuerpo MDX del post." },
            locale: { type: "string", enum: ["es", "en", "it"], default: "es" },
            tags: { type: "array", items: { type: "string" } },
            date: { type: "string", description: "ISO date YYYY-MM-DD; default = hoy." },
            author: { type: "string", default: "Alberto Carrasco" },
            published: { type: "boolean", default: true },
            cover: { type: "string", description: "Nombre de marker (slug-key) usado como portada." },
            translationKey: { type: "string", description: "Agrupa posts hermanos i18n. Default = slug." },
            skip_rebuild: {
              type: "boolean",
              default: false,
              description: "Si true, no dispara rebuild automático tras crear.",
            },
          },
          required: ["title", "description", "content"],
        },
```

- [ ] **Step 5: Run test to verify it passes**

```
npx jest __tests__/lib/posts-write-cover.test.ts --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add lib/blog/posts-write.ts lib/mcp/rpc-handler.ts __tests__/lib/posts-write-cover.test.ts
git commit -m "$(cat <<'EOF'
feat(mcp): accept cover and translationKey in posts_create

Scope: lib/blog/posts-write.ts (CreatePostInput + frontmatter assembly), lib/mcp/rpc-handler.ts (posts_create input schema and tools/call branch).
Problem: with markers in place, posts_create needed two new optional fields so the LLM can pick a cover and group i18n siblings under one translationKey at creation time.
Solution: pass-through both fields to the frontmatter, emitting them only when present. The tool description now documents the marker convention so the LLM picks it up alongside the schema.
Notes: backward compatible — existing callers omitting both fields produce the same MDX as before.
EOF
)"
```

---

### Task G6: Modify `posts_delete` to clean up `public/uploads/<key>/`

**Files:**
- Modify: `lib/blog/posts-write.ts` (deletePost — add cleanup)
- Test: `__tests__/lib/posts-write-delete-cleanup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
      description: "post solo",
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
      title: "ES",
      description: "es post",
      content: "x".repeat(60),
      locale: "es",
      tags: [],
      translationKey: "ferdy-2026",
    })
    await createPost({
      title: "EN",
      description: "en post",
      content: "x".repeat(60),
      locale: "en",
      tags: [],
      translationKey: "ferdy-2026",
    })
    fs.mkdirSync(path.join(tmp, "uploads", "ferdy-2026"))
    fs.writeFileSync(path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg"), "x")
    await writeMeta("ferdy-2026", { fachada: { ext: "jpg", kind: "image", alt: "", caption: "" } })

    await deletePost({ slug: "es", locale: "es" })
    expect(fs.existsSync(path.join(tmp, "uploads", "ferdy-2026"))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx jest __tests__/lib/posts-write-delete-cleanup.test.ts --no-coverage
```

- [ ] **Step 3: Modify `deletePost`**

In `lib/blog/posts-write.ts`, after the `.mdx` is removed, add:

```ts
  // Cleanup: if the deleted post was the last sibling of its translationKey,
  // remove public/uploads/<key>/ as well.
  const { findPostsByTranslationKey } = await import("./translation-key")
  const remaining = await findPostsByTranslationKey(post.translationKey)
  if (remaining.length === 0) {
    const { deleteMetaForKey } = await import("./media-meta")
    await deleteMetaForKey(post.translationKey)
  }
```

(Adjust based on the existing `deletePost` flow. The function currently looks the post up via `listPostsFromDisk` — you can reuse the same lookup result for `translationKey`.)

- [ ] **Step 4: Run test to verify it passes**

```
npx jest __tests__/lib/posts-write-delete-cleanup.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add lib/blog/posts-write.ts __tests__/lib/posts-write-delete-cleanup.test.ts
git commit -m "$(cat <<'EOF'
fix(media): remove uploads dir when deleting the last sibling of a translationKey

Scope: lib/blog/posts-write.ts — after deleting the .mdx, check if any sibling remains for the post's translationKey; if not, remove public/uploads/<key>/ via deleteMetaForKey.
Problem: deleting a post with no siblings used to leave its uploads on disk forever, growing the disk and surfacing in posts_validate as orphans nobody owns.
Solution: post-delete cleanup that runs only when the sibling count is zero. Posts with i18n siblings keep their uploads intact (they're still referenced).
Notes: deleteMetaForKey is idempotent — safe to call when the directory is already gone.
EOF
)"
```

---

## Phase H — Cleanup, gitignore, deploy notes

### Task H1: `.gitignore`, dead code grep, deploy notes

**Files:**
- Modify: `.gitignore`
- Modify (potentially): docs

- [ ] **Step 1: Update `.gitignore`**

Append:

```
public/uploads/
```

- [ ] **Step 2: Verify there's no leftover `appendMediaToBody`**

```
grep -rn "appendMediaToBody" lib/ app/ __tests__/
```
Expected: no matches. If any appear, delete them and their tests.

- [ ] **Step 3: Document nginx + disk monitoring in the spec's deploy section**

Open `docs/superpowers/specs/2026-05-05-media-uploads-with-markers-design.md` and confirm the "Tareas de deploy fuera del repo" section is up to date (it already documents nginx). If anything is missing, append.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore(media): ignore public/uploads in git

Scope: .gitignore — add public/uploads/ so binaries uploaded through the new flow do not get committed.
Problem: media uploads land under public/uploads/<translationKey>/; without an ignore rule, every upload would dirty the working tree.
Solution: blanket ignore at the directory level. _meta.json files are tracked under the same path only by accident — they're not committed because the parent is ignored, which matches the design (the form is the authoritative writer).
Notes: nginx config (client_max_body_size 1100M, proxy_request_buffering off) and disk monitoring instructions live in docs/superpowers/specs/2026-05-05-media-uploads-with-markers-design.md.
EOF
)"
```

---

## Phase I — End-to-end verification

### Task I1: Full test suite + build + production smoke

- [ ] **Step 1: Run the full Jest suite with coverage**

```
npm test -- --coverage
```
Expected: PASS, coverage ≥ 85% on the touched files.

- [ ] **Step 2: Run a fresh build**

```
npm run build
```
Expected: green build, no warnings about missing modules.

- [ ] **Step 3: Production smoke (after deploy)**

Generate a token from the chat using `posts_request_upload({slug:"<an-existing-slug>", locale:"es"})` and follow the URL. Upload a small image and a small video, fill Name/Alt/Caption, hit Submit. Then in the chat:

- `posts_list_media({slug, locale})` — should list both files.
- `posts_create` (or `posts_update_body` on an existing post) with `[image:X]`, `[video:Y]`, `cover: X`.
- `posts_validate({slug, locale})` — should return `ok: true`.
- `posts_rebuild()`.
- Visit the public URL of the post in es / en / it. The image, the video, and the cover should all render. Visit a post URL with a deliberately broken marker — should show the `<MediaMissing>` placeholder, not a 500.

- [ ] **Step 4: Smoke verification commit**

If smoke uncovers no regressions, no commit is needed — there's no code change. If smoke uncovers a fix, that's a separate commit with the project's commit message style.

---

## Self-Review

**Spec coverage check:**
- Markers `[image:X]`, `[video:X]`, `cover` — Tasks A1 (slugify), C1 (MediaMissing), C2 (resolver), C3 (wire-in).
- Storage layout `public/uploads/<key>/` + `_meta.json` — Tasks B1, B2.
- Render-time expansion — Tasks C2, C3.
- Tools `posts_request_upload`, `posts_update_body`, `posts_list_media`, `posts_validate` — Tasks G1, G2, G3, G4.
- Tools modified `posts_create`, `posts_delete` — Tasks G5, G6.
- `instructions` in initialize — Task G1.
- Form `/admin/media-upload` — Task F1.
- Endpoints `/upload`, `/upload/commit`, `/token-info` — Tasks E1, E2, E3.
- JWT `signUploadToken` / `verifyUploadToken` — Task D1.
- `<MediaMissing>` component + register — Task C1.
- `.gitignore`, nginx note — Task H1.
- Migration of legacy posts — out of scope of this plan (the spec acknowledges; will be a separate ticket).

**Placeholder scan:** every code step contains a complete code block. The only narrative-style instructions are: "adapt to the existing top of `lib/blog/posts-write.ts`" (because that file's import block already has gray-matter) and "adapt based on the existing `deletePost` flow" (Task G6 — the function exists and mutates already, the addition is a small block at the end). These are localized adjustments, not unspecified work.

**Type consistency:** `MediaKind` is exported from `media-meta.ts` and reused in `media-storage.ts`, `media-markers.ts`, and the API routes. `RuntimePost.translationKey` is a `string` (default = slug). Tool input shapes match between `toolsList()` and the matching `tools/call` branches.

---

## Execution Handoff

Plan complete. The two execution options will be presented after this file is committed. Recommended path: subagent-driven so each task lands as a self-contained commit with a tight review loop.

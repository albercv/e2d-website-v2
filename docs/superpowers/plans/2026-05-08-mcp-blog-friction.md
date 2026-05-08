# MCP Blog — Friction Backlog & First-Pass Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the friction documented in the 2026-05-08 bug report from the web agent. This first pass unblocks the immediate "draft post → choose cover → publish" cycle by exposing a dedicated `posts_set_cover` MCP tool, bumps the upload-token TTL, improves the orphan-conflict error, and refreshes the MCP documentation so Claude.ai knows what to call. The remaining items (full frontmatter editor, media delete/update tools, slug param, alt warnings, UI fixes) are scoped here as future work, not implemented in this pass.

**Architecture:** Cover lives in two places — `_meta.json.cover` (set via the upload form / now via MCP) and the post frontmatter `cover:` field. `resolveCover()` (`lib/blog/media-markers.ts`) gives precedence to `meta.cover` over the frontmatter, so writing only `_meta.json.cover` is sufficient and idempotent. The new tool is a thin wrapper over the existing `writeMeta(key, {}, { cover })` three-state semantics — no schema migration, no rebuild required. The "exists" error is enriched with `details` so the LLM can surface a useful message instead of a bare code.

**Tech Stack:** Next.js 14, TypeScript, MCP JSON-RPC handler at `lib/mcp/rpc-handler.ts`, file-based meta at `lib/blog/media-meta.ts`, Jest for tests.

---

## Scope of this pass (autonomous, no rebuild/restart)

- ✅ **Task 1** — Plan doc (this file).
- ✅ **Task 2** — `setCover()` helper in `lib/blog/media-cover.ts` + unit tests.
- ✅ **Task 3** — `posts_set_cover` MCP tool in `lib/mcp/rpc-handler.ts` + dispatch + tests.
- ✅ **Task 4** — Update `initialize.instructions` and `posts_set_cover` tool description so Claude.ai discovers it.
- ✅ **Task 5** — Bump upload-token TTL from 900 s (15 min) to 3600 s (1 h).
- ✅ **Task 6** — Enrich `MediaStorageError("exists")` with `details` (path, slug-key, existing kind/ext) so the LLM can surface a useful message.
- ✅ **Task 7** — Refresh agent prompt at `docs/agent-prompts/blog-claude-project.md` to reflect every change made up to this point (markers `[image]/[video]/[contact]`, MDX components, the new `posts_set_cover` tool, the workflow, confirmations, i18n).
- ⏳ **Out of this pass:** `npm run build && pm2 restart e2d` — operator step. Without it the changes don't reach the live MCP, but every test passes locally and the diff is small and reversible.

## Future work (deferred, ordered by priority)

Each item gets its own plan when picked up. Priority order:

1. **`posts_update_frontmatter`** — most urgent. Without it, transitioning `published: false → true` requires `posts_delete + posts_create`, which loses slug/date/translationKey/external links. Should accept partial updates: `{ slug, locale, cover?, title?, description?, tags?, published?, date? }`. Validate slug uniqueness on rename. ~1.5 days.
2. **`posts_delete_media`** — deletes a single uploaded file by slug-key. Closes the orphan-conflict loop on its own. ~0.5 days.
3. **`posts_update_media`** — rename/alt/caption/setAsCover combined. ~1 day.
4. **`slug` param on `posts_create`** — optional; when present, used verbatim after `slugify()` normalisation; conflict check against existing slugs. Documents the title-derived fallback. ~0.5 days.
5. **Auto-cover on upload** — when the upload-form commit lands a slug-key matching the post's frontmatter `cover`, set `_meta.json.cover` automatically. ~2 hours.
6. **Validation warnings** — extend `ValidationResult` with `warnings: { type: "missing_alt", name }[]`. Empty `alt` becomes a warning, not an error. ~0.5 days.
7. **UI fixes (#2 + #4 from report)** — explicit "Save metadata" button per file in `MediaUploadForm.tsx`, with persistence feedback. ~0.5–1 day depending on form internals.

---

## Task 2 — `setCover()` helper

**Files:**
- Create: `lib/blog/media-cover.ts`
- Create: `__tests__/lib/media-cover.test.ts`

- [x] **Step 1: failing tests**

```typescript
// __tests__/lib/media-cover.test.ts
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { setCover, SetCoverError } from "@/lib/blog/media-cover"
import { writeMeta, readMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"

describe("setCover", () => {
  let root: string
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "set-cover-"))
    process.env.MEDIA_UPLOADS_ROOT = root
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("sets meta.cover when the named entry exists and is an image", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await setCover("k1", "hero")
    const meta = await readMeta("k1")
    expect(meta.cover).toBe("hero")
  })

  it("clears meta.cover when name is null", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } }, { cover: "hero" })
    await setCover("k1", null)
    const meta = await readMeta("k1")
    expect(meta.cover).toBeUndefined()
  })

  it("throws not_found when the entry does not exist", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await expect(setCover("k1", "missing")).rejects.toThrow(SetCoverError)
  })

  it("throws kind_mismatch when the entry is a video", async () => {
    await writeMeta("k1", { reel: { ext: "mp4", kind: "video", alt: "", caption: "" } })
    await expect(setCover("k1", "reel")).rejects.toMatchObject({ code: "kind_mismatch" })
  })
})
```

- [x] **Step 2: implementation**

```typescript
// lib/blog/media-cover.ts
import { readMeta, writeMeta } from "./media-meta"

export class SetCoverError extends Error {
  constructor(public code: "not_found" | "kind_mismatch", message: string) {
    super(message)
    this.name = "SetCoverError"
  }
}

export async function setCover(translationKey: string, cover: string | null): Promise<void> {
  if (cover === null) {
    await writeMeta(translationKey, {}, { cover: null })
    return
  }
  const meta = await readMeta(translationKey)
  const entry = meta.files[cover]
  if (!entry) throw new SetCoverError("not_found", `media "${cover}" not found in ${translationKey}`)
  if (entry.kind !== "image") throw new SetCoverError("kind_mismatch", `media "${cover}" is a ${entry.kind}, only images can be covers`)
  await writeMeta(translationKey, {}, { cover })
}
```

- [x] **Step 3: commit**

---

## Task 3 — `posts_set_cover` MCP tool

**Files:** `lib/mcp/rpc-handler.ts`, `__tests__/lib/mcp-rpc-handler.test.ts`

- [x] **Step 1**: register the tool in `toolsList()` with input schema `{ slug, locale, cover: string | null }`.
- [x] **Step 2**: dispatch in `handleRpcCall` — require scope `posts:write`, resolve translation key via `getTranslationKeyForSlug`, call `setCover(key, args.cover)`, return `{ ok: true, cover: <name|null> }` or appropriate error.
- [x] **Step 3**: update the `tools/list` test to include `posts_set_cover` in the alphabetised list.
- [x] **Step 4**: add a test that verifies the dispatch path against a tmp dir with a seeded post + meta.
- [x] **Step 5**: commit.

---

## Task 4 — Documentation refresh

**File:** `lib/mcp/rpc-handler.ts` (initialize.instructions)

- [x] Add a "GESTIÓN DE PORTADA" paragraph to `instructions` with: when to call `posts_set_cover`, allowed values, why it beats re-creating a post.
- [x] Add the new tool description to its registry entry: scope, semantics, idempotency, what `null` does.
- [x] Commit.

---

## Task 5 — Upload TTL

**File:** `lib/mcp/rpc-handler.ts:546`

- [x] Change `const ttl = 900` to `const ttl = 3600`.
- [x] Mention the new TTL in the `posts_request_upload` description ("la URL caduca en 1 h").
- [x] Commit.

---

## Task 6 — Enrich the `exists` error

**Files:** `lib/blog/media-storage.ts`, `app/api/admin/media/upload/route.ts`

- [x] Extend `MediaStorageError` to carry an optional `details` object.
- [x] When throwing `exists`, populate `details` with `{ path, name, ext, kind }` of the conflicting file.
- [x] In the upload route, surface those details in the JSON response so the form (and Claude when it eventually drives it) can render a useful message.
- [x] Commit.

---

## Task 7 — Agent prompt

**File:** `docs/agent-prompts/blog-claude-project.md`

- [x] Single self-contained Markdown the user pastes into the Claude.ai Project custom instructions.
- [x] Sections covered: identity & tone; tools (with the new `posts_set_cover`); markers (`[image]`, `[video]`, `[contact]`, frontmatter `cover`); MDX components catalogue with JSX signatures; anti-prosa-plana checklist; conversational creation workflow; edit / delete / cover-change workflows with confirmation rules; i18n (ES first, then offer EN/IT); hard rules (no inventing components, no rebuild unless asked, no `published: true` without explicit OK).
- [x] Commit.

---

## Verification (operator, on return)

Once `npm run build && pm2 restart e2d` is run:

1. **`tools/list` exposes `posts_set_cover`.** Quick check: `curl -s -H "Authorization: Bearer <admin-token>" -X POST https://evolve2digital.com/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'`.
2. **Setting a cover works.** From Claude.ai with the connector: pick any post, list its media, call `posts_set_cover` with one of the image slug-keys, then `posts_request_upload` to confirm `cover` in the response reflects the new value.
3. **TTL is 1h.** `posts_request_upload` response now has `expiresAt - now() ≈ 3600`.
4. **Exists error.** Upload a duplicate slug-key via the form; the response body now includes `details: { path, name, ext, kind }`.
5. **Instructions visible.** A new Claude.ai session shows the GESTIÓN DE PORTADA block in its server instructions; tools/list shows `posts_set_cover` with its description.

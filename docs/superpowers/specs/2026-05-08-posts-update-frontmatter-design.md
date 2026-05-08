# `posts_update_frontmatter` MCP tool — design

**Date:** 2026-05-08
**Branch:** `feature/chatgpt-custom-connector`
**Goal:** Let the LLM (and any MCP client) edit a post's frontmatter without rewriting its body. Closes the friction documented in the 2026-05-08 backlog item #1: today flipping `published: false → true` requires `posts_delete + posts_create`, which loses slug/date/translationKey/external links and forces re-uploads of media. The new tool keeps the file identity stable.

**Status:** design approved — awaiting user review of this spec before implementation plan.

---

## Context

- `lib/blog/posts-write.ts` already exposes `createPost`, `deletePost`, `updatePostBody`, `triggerRebuild`. `updatePostBody` rewrites the body via `matter.stringify(content, parsed.data)` but preserves frontmatter intact. There is no symmetric helper for frontmatter.
- Frontmatter shape (set by `createPost`): `title`, `description`, `date`, `locale`, `slug`, `tags`, `author`, `published`, optional `cover`, optional `translationKey`.
- Cover lives in two places: post frontmatter `cover:` and `_meta.json.cover` (per translationKey, set via `posts_set_cover`). `resolveCover()` in `lib/blog/media-markers.ts` gives precedence to `meta.cover` over the frontmatter, falling back to frontmatter for legacy posts.
- The recent friction-backlog plan (2026-05-08) listed `posts_update_frontmatter` as the highest-priority follow-up.

## Non-goals

- Rename slug. Renaming a slug means moving the `.mdx` file, breaking external links, and ideally registering a 301. Different operation; future `posts_rename_slug` if needed.
- Change locale. Same reasoning — different file, different URL.
- Change `translationKey`. Cross-locale invariant; editing it desyncs siblings.
- Edit body content. That is `posts_update_body`.

## Tool interface

```jsonc
// JSON-RPC method: tools/call
// name: "posts_update_frontmatter"
// arguments:
{
  "slug": string,                 // required, identifies the post
  "locale": "es" | "en" | "it",   // required
  "title": string?,               // optional, partial update
  "description": string?,
  "tags": string[]?,              // [] permitted = clear all tags
  "author": string?,
  "published": boolean?,
  "date": string?,                // YYYY-MM-DD
  "cover": (string | null)?       // null = remove from both frontmatter and _meta.json.cover
}
```

Scope: `posts:write`.

Result on success:
```jsonc
{
  "ok": true,
  "slug": string,
  "locale": "es" | "en" | "it",
  "updated": string[],            // names of frontmatter fields actually changed
  "coverSyncedToMeta": boolean    // true if the call also wrote _meta.json.cover; false otherwise (including when cover was not in the call)
}
```

Omitted fields = no change. Empty result `{ updated: [] }` is valid (nothing to do). When `cover` is not part of the call, `coverSyncedToMeta` is always `false`.

## Validation rules

Mirrors `createPost` for consistency.

| Field | Rule | Error code | Error details |
|---|---|---|---|
| `slug` | trimmed, non-empty | `invalid_params` | `{ field: "slug" }` |
| `locale` | in `SUPPORTED_LOCALES` (`es`, `en`, `it`) | `unsupported_locale` | `{ supported }` |
| `title` (if present) | trimmed length ≥ 3 | `invalid_params` | `{ field: "title" }` |
| `description` (if present) | trimmed length ≥ 10 | `invalid_params` | `{ field: "description" }` |
| `tags` (if present) | `string[]`; each item non-empty trimmed string | `invalid_params` | `{ field: "tags" }` |
| `author` (if present) | trimmed length ≥ 1 | `invalid_params` | `{ field: "author" }` |
| `published` (if present) | `typeof === "boolean"` | `invalid_params` | `{ field: "published" }` |
| `date` (if present) | matches `/^\d{4}-\d{2}-\d{2}$/` and parses as a real date | `invalid_params` | `{ field: "date" }` |
| `cover` (if present) | `string \| null`; if string, non-empty trimmed | `invalid_params` | `{ field: "cover" }` |
| Cover kind (if string) | `_meta.files[cover].kind !== "video"` (when meta has it) | `kind_mismatch` | `{ field: "cover", kind: "video" }` |
| Post exists | `listPostsFromDisk()` finds matching `slug` + `locale` | `not_found` | `{ slug, locale }` |

No `confirm` flag — consistent with `updatePostBody`. The hard rule "no `published: true` without explicit user OK" lives in the LLM playbook (`docs/agent-prompts/blog-claude-project.md`), not in the tool contract.

## Behavior — partial update with cover sync

```
updatePostFrontmatter(input):
  1. Validate shape of all present fields. Reject early on first failure.
  2. Read .mdx via fs.readFile, parse with gray-matter.
  3. If cover is a string:
       - Read meta(translationKey). If meta.files[cover] exists and kind === "video" → reject kind_mismatch.
  4. Build mergedData = { ...parsed.data }, applying only fields that differ from current values:
       - For tags: deep array compare.
       - For cover === null: delete mergedData.cover.
       - For cover string: set mergedData.cover = cover.
       - Other primitives: simple !== check.
     Track updated[] = list of changed field names.
  5. If updated[] is empty → return { ok: true, updated: [] } without writing. (No-op).
  6. Write file via matter.stringify(parsed.content, mergedData).
  7. If cover was passed:
       - cover === null: setCover(translationKey, null). coverSyncedToMeta = true.
       - cover === string AND meta.files[cover] exists AND kind === "image": setCover(translationKey, cover). coverSyncedToMeta = true.
       - cover === string AND meta has no entry for cover: skip setCover. coverSyncedToMeta = false. (Pre-upload-time placeholder.)
  8. clearPostsRuntimeCache().
```

## Behavior — sibling frontmatter sync

`cover` is logically per-translationKey (one image shared across `.es` / `.en` / `.it`). When any tool changes the cover, all siblings should reflect the new value in their frontmatter. A new helper `syncCoverToFrontmatter(translationKey, cover)` lives in `lib/blog/posts-write.ts`:

```
syncCoverToFrontmatter(translationKey, cover: string | null):
  - Find all posts with translationKey via lib/blog/translation-key.ts.
  - For each, parse the .mdx, set frontmatter cover (string) or delete the field (null), write back.
  - Best-effort per file: a single read/write failure does not abort the rest; failures are returned but do not throw.
```

Both write paths use it:

- `posts_update_frontmatter` invokes `syncCoverToFrontmatter` after writing the target post's frontmatter, when `cover` was in the call. This means `posts_update_frontmatter({ slug:"x.es", cover:"hero" })` writes `.es` directly in step 6 of the partial-update flow, then syncs `.en` / `.it` via this helper.
- `posts_set_cover` (the MCP dispatch in `rpc-handler.ts`) calls `syncCoverToFrontmatter` after `setCover()` returns, hitting all siblings including the originating one.

Both paths converge on the same end state: `_meta.json.cover` is updated and every sibling's frontmatter agrees with it.

`syncCoverToFrontmatter` lives in `posts-write.ts` (not in `media-cover.ts`) to avoid a circular import — `posts-write.ts` already imports from `media-meta.ts`, and `media-cover.ts` would otherwise need to import `posts-write.ts` to reach the helper.

## Implementation outline

### Files

- **Modify** `lib/blog/posts-write.ts`:
  - Add `UpdatePostFrontmatterInput` interface.
  - Add `updatePostFrontmatter(input)` function.
  - Add exported `syncCoverToFrontmatter(translationKey, cover)` helper used by both write paths.
- **Modify** `lib/mcp/rpc-handler.ts`:
  - Add `posts_update_frontmatter` to `toolsList()` (alphabetical order — sits between `posts_set_cover` and `posts_update_body`).
  - Add dispatch branch in `handleRpcCall`.
  - Extend `posts_set_cover` dispatch to call `syncCoverToFrontmatter` after `setCover`.
- `lib/blog/media-cover.ts` is **not** modified. It stays focused on `_meta.json.cover`. The frontmatter ripple is the dispatcher's responsibility.
- **Modify** `initialize.instructions` in `rpc-handler.ts`:
  - Add a "GESTIÓN DE FRONTMATTER" section: when to use `posts_update_frontmatter`, examples (publish a draft, fix typo, retag, change date, change cover), what NOT to do (no slug rename, no locale change, no body edits — those go elsewhere).
- **Modify** `docs/agent-prompts/blog-claude-project.md`:
  - Update playbook: "for any frontmatter edit including `published`, use `posts_update_frontmatter` — never `posts_delete` + `posts_create`".

### File-size note

`posts-write.ts` is currently 371 lines, already over the 300-line guideline in CLAUDE.md. Adding ~80 more lines pushes it to ~450. The cohesion with `createPost`/`deletePost`/`updatePostBody` justifies keeping them together for now. A follow-up housekeeping task can split into `posts-create.ts` / `posts-delete.ts` / `posts-update.ts` if the file becomes hard to navigate.

### Cache invalidation

`clearPostsRuntimeCache()` after every successful write. Same as `updatePostBody`.

### Error mapping (MCP)

| Internal code | JSON-RPC error code | Notes |
|---|---|---|
| `invalid_params` | `-32602` | Standard |
| `unsupported_locale` | `-32602` | With `data: { supported }` |
| `not_found` | `-32000` | With `data: { code: "not_found", slug, locale }` |
| `kind_mismatch` | `-32000` | With `data: { code: "kind_mismatch", field, kind }` |
| `internal_error` | `-32603` | Read/write failures |

## Tests

### Unit — `__tests__/lib/posts-write-update-frontmatter.test.ts`

All in tmpdir via `BLOG_POSTS_DIR=mkdtempSync(...)` and `MEDIA_UPLOADS_ROOT=mkdtempSync(...)` (regression rule from BUG-15: never let tests hit the prod content dir).

1. Partial update: only `published: true` flips that field; other frontmatter fields and body byte-for-byte identical.
2. `published: false → true` persists across `listPostsFromDisk()` (post becomes visible).
3. Multiple fields in one call updated atomically.
4. `tags: []` clears all tags.
5. `cover: "hero"` with meta containing `hero` (image): frontmatter cover set, `_meta.json.cover === "hero"`, `coverSyncedToMeta: true`.
6. `cover: "hero"` with no meta yet: frontmatter cover set, `_meta.json` untouched, `coverSyncedToMeta: false`, no error.
7. `cover: "reel"` with meta entry kind=video: rejected with `kind_mismatch`, no writes.
8. `cover: null`: frontmatter cover deleted, `_meta.json.cover` cleared, `coverSyncedToMeta: true`.
9. `date: "2025-13-99"`: rejected `invalid_params { field: "date" }`.
10. `title: "ab"` (too short): rejected `invalid_params`.
11. Post not found: `not_found`.
12. No-op: passing only the same values that already exist returns `{ updated: [] }` and skips writing (mtime unchanged).
13. Sibling ripple: when `posts_set_cover({ slug:"x.es", cover:"hero" })` is called and `x` has `.es` + `.en` + `.it` siblings, all three frontmatters get `cover: hero`.

### Integration — `__tests__/lib/mcp-rpc-handler.test.ts` (or a new `mcp-update-frontmatter.test.ts`)

14. `tools/list` includes `posts_update_frontmatter` with the documented input schema and scope `posts:write`.
15. Dispatch without a Bearer providing `posts:write` scope → `-32000` insufficient_scope.
16. Happy path: dispatch with valid args returns the documented success shape.
17. Existing `posts_set_cover` test extended: after the call, the post's frontmatter also reflects the new cover (regression for the symmetry extension).

## Verification (post-deploy)

1. `tools/list` exposes `posts_update_frontmatter` and the description matches the spec.
2. Flip a real draft `published: false → true` from Claude.ai; reload `/<locale>/blog/<slug>` — page renders.
3. Change a cover via `posts_update_frontmatter` and confirm both `_meta.json.cover` and the frontmatter file reflect it.
4. Confirm `posts_set_cover` followed by `cat content/posts/<slug>.<locale>.mdx | head -20` shows the new cover in frontmatter for every sibling.

## Open follow-ups (not in this spec)

- `posts_rename_slug` — separate tool, separate spec.
- File split of `posts-write.ts` once it grows past 450 lines.
- `tags` array sort/dedup convention — current behavior is no normalization; if drift becomes painful, decide later.
- A future "frontmatter diff" warning in `posts_validate` when `_meta.json.cover` and frontmatter `cover` disagree (low priority once both tools sync).

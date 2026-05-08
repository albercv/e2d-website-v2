import { readMeta, writeMeta } from "./media-meta"

export type SetCoverErrorCode = "not_found" | "kind_mismatch"

export class SetCoverError extends Error {
  constructor(public code: SetCoverErrorCode, message: string) {
    super(message)
    this.name = "SetCoverError"
  }
}

/**
 * Sets (or clears, when `cover === null`) the top-level `cover` field of
 * `_meta.json` for the given translation key. The cover takes precedence over
 * any frontmatter `cover:` declared in the post (see `resolveCover`), so this
 * is the single source of truth for "which image is the post hero".
 *
 * Idempotent: calling with the same value twice is a no-op semantically.
 *
 * Validates that:
 *  - the named entry exists in `meta.files`
 *  - the entry has `kind: "image"` (videos cannot be covers)
 */
export async function setCover(translationKey: string, cover: string | null): Promise<void> {
  if (cover === null) {
    await writeMeta(translationKey, {}, { cover: null })
    return
  }
  const meta = await readMeta(translationKey)
  const entry = meta.files[cover]
  if (!entry) {
    throw new SetCoverError("not_found", `media "${cover}" not found in ${translationKey}`)
  }
  if (entry.kind !== "image") {
    throw new SetCoverError(
      "kind_mismatch",
      `media "${cover}" is a ${entry.kind}, only images can be covers`
    )
  }
  await writeMeta(translationKey, {}, { cover })
}

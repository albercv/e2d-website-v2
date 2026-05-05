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

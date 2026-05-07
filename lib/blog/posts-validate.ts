// lib/blog/posts-validate.ts
import * as fs from "fs"
import * as path from "path"
import { listPostsFromDisk, type RuntimeLocale } from "./posts-runtime"
import { readMeta } from "./media-meta"
import { tokenize } from "./media-markers"

export interface ValidationResult {
  ok: boolean
  missingMarkers: Array<{ kind: "image" | "video"; name: string; reason: "not_found" | "kind_mismatch" }>
  unusedMedia: string[]
  coverOk: boolean
  missingBinaries: Array<{ name: string; expectedPath: string }>
}

const MARKER_RE = /\[(image|video):([a-z0-9_]+)\]/g

function getUploadsRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

export async function validatePost(slug: string, locale: RuntimeLocale): Promise<ValidationResult> {
  const all = await listPostsFromDisk()
  const post = all.find((p) => p.slug === slug && p.locale === locale)
  if (!post) {
    return { ok: false, missingMarkers: [], unusedMedia: [], coverOk: false, missingBinaries: [] }
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

  // Check physical existence of every binary referenced by markers/cover.
  const root = getUploadsRoot()
  const missingBinaries: ValidationResult["missingBinaries"] = []
  for (const name of used) {
    const entry = meta.files[name]
    if (!entry) continue
    const expectedPath = path.join(root, post.translationKey, `${name}.${entry.ext}`)
    if (!fs.existsSync(expectedPath)) {
      missingBinaries.push({ name, expectedPath })
    }
  }

  return {
    ok: missing.length === 0 && coverOk && missingBinaries.length === 0,
    missingMarkers: missing,
    unusedMedia: unused,
    coverOk,
    missingBinaries,
  }
}
